import {
  type AmbienceDto,
  type AmbienceOrCustomDto,
  type AmbienceSettingsDto,
  type ChangeSettingsDto,
  GAP_MARKER,
  type LobbyRoundDto,
  MAXIMUM_ROUNDS,
  MINIMUM_PLAYERS,
  type RoomSettingsDto,
  type RoundContentDto,
  type RoundSettingsDto,
} from '@thelever-app/protocol';
import { Dialog } from 'radix-ui';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../components/icon.tsx';
import { DilemmaText } from '../game/dilemma-text.tsx';
import { VariantBadges } from '../components/variant-badges.tsx';
import { AMBIENCE_ICONS, AMBIENCES, isForAdults, variantOf } from './ambiences.ts';
import { CATEGORIES, type Category } from './categories.ts';
import { PickRoundDilemmaSheet } from './pick-round-dilemma-sheet.tsx';
import { roundNumbersByDilemma, toggledCategory } from './rounds.ts';
import styles from './room-settings-sheet.module.css';
import sheet from './sheet.module.css';

interface RoomSettingsSheetProps {
  readonly roomId: string;
  readonly settings: RoomSettingsDto;
  /** The ambience whose configuration the room has, or custom. */
  readonly ambience: AmbienceOrCustomDto;
  /** Someone in the room is under 18: nothing for adults can be turned on. */
  readonly hasPlayerUnderEighteen: boolean;
  /** The rounds of the room as the lobby has them now, with what the players chose. */
  readonly rounds: readonly LobbyRoundDto[];
  /** Only what changed, the rounds whole; never empty. */
  readonly onSave: (changes: ChangeSettingsDto['changes']) => void;
  /** What each ambience sets in the room, as the room server gives it to the host. */
  readonly ambiences: Readonly<Record<AmbienceDto, AmbienceSettingsDto>>;
  readonly onClose: () => void;
}

/** The dilemma the host set for a specific round, with what the screen knows to describe it. */
interface RoundDilemma {
  readonly dilemmaId: string;
  readonly text: string;
  /** Only for one the host chose in this sheet: the lobby only says its text. */
  readonly meta?: string;
}

/**
 * A round as the host is setting it. `key` tells it apart on screen; `id` is the one the room gave
 * it, none for a round the host adds. A specific round has no dilemma until the host chooses one.
 */
type DraftRound =
  | {
      readonly key: number;
      readonly id: number | undefined;
      readonly origin: 'random';
      readonly categories: readonly Category[] | null;
      readonly content: RoundContentDto;
    }
  | {
      readonly key: number;
      readonly id: number | undefined;
      readonly origin: 'specific';
      readonly dilemma: RoundDilemma | undefined;
    }
  | { readonly key: number; readonly id: number | undefined; readonly origin: 'players' };

type Origin = DraftRound['origin'];

const TIMES_PER_DILEMMA = [30, 45, 60, 90] as const;
const ORIGINS: readonly (readonly [Origin, IconName])[] = [
  ['random', 'shuffle'],
  ['specific', 'pushPin'],
  ['players', 'groupsOutline'],
];

function draftOf(rounds: readonly LobbyRoundDto[]): DraftRound[] {
  return rounds.map((round): DraftRound => {
    const { roundId } = round;
    switch (round.origin) {
      case 'random':
        return {
          key: roundId,
          id: roundId,
          origin: 'random',
          categories: round.categories,
          content: round.content,
        };
      case 'specific':
        return { key: roundId, id: roundId, origin: 'specific', dilemma: round.dilemma };
      case 'players':
        return { key: roundId, id: roundId, origin: 'players' };
    }
  });
}

/** The rounds as the room takes them; none of them a specific round without its dilemma. */
function settingsOf(rounds: readonly DraftRound[]): RoundSettingsDto[] {
  return rounds.flatMap((round): RoundSettingsDto[] => {
    const id = round.id === undefined ? {} : { id: round.id };
    switch (round.origin) {
      case 'random':
        return [
          {
            ...id,
            origin: 'random',
            categories: round.categories && [...round.categories],
            content: round.content,
          },
        ];
      case 'specific':
        return round.dilemma
          ? [{ ...id, origin: 'specific', dilemmaId: round.dilemma.dilemmaId }]
          : [];
      case 'players':
        return [{ ...id, origin: 'players' }];
    }
  });
}

/** What changed between the settings the room has and the ones on screen. */
function changesBetween(before: RoomSettingsDto, after: RoomSettingsDto): Partial<RoomSettingsDto> {
  return Object.fromEntries(
    Object.entries(after).filter(([key, value]) => before[key as keyof RoomSettingsDto] !== value),
  ) as Partial<RoomSettingsDto>;
}

/** A round of the origin the host taps, as new: random from every category, or still to fill. */
function withOrigin(round: DraftRound, origin: Origin): DraftRound {
  const { key, id } = round;
  switch (origin) {
    case 'random':
      return { key, id, origin, categories: null, content: ANY_CONTENT };
    case 'specific':
      return { key, id, origin, dilemma: undefined };
    case 'players':
      return { key, id, origin };
  }
}

const ANY_CONTENT: RoundContentDto = { age: 'any', compromising: 'any' };

/** Whether the settings let the random rounds choose that part of their content. */
function allows(settings: RoomSettingsDto, axis: keyof RoundContentDto): boolean {
  return axis === 'age' ? settings.adultsOnly : settings.compromisingDilemmas;
}

/** The content with each part the settings do not allow back to any. */
function allowedIn(settings: RoomSettingsDto, content: RoundContentDto): RoundContentDto {
  return {
    age: allows(settings, 'age') ? content.age : 'any',
    compromising: allows(settings, 'compromising') ? content.compromising : 'any',
  };
}

/** What the settings start from: the room as it is, or the ambience the host chose in them. */
interface Starting {
  readonly ambience: AmbienceOrCustomDto;
  readonly settings: RoomSettingsDto;
  readonly rounds: readonly DraftRound[];
}

/**
 * The host changes the configuration of the room and its rounds before starting. Choosing an
 * ambience fills the fields in with what it sets, without closing, and the room only takes it on
 * saving; the ambience shows as custom once a field it sets moves away from it. A change that rules
 * out part of the content of a round takes it back to any.
 */
export function RoomSettingsSheet({
  roomId,
  settings,
  ambience,
  hasPlayerUnderEighteen,
  rounds,
  onSave,
  ambiences,
  onClose,
}: RoomSettingsSheetProps) {
  const { t } = useTranslation();
  const minimumId = useId();
  const [draft, setDraft] = useState(settings);
  const [draftRounds, setDraftRounds] = useState(() => draftOf(rounds));
  // Every round opens folded into its summary line; only the one the host edits unfolds.
  const [unfolded, setUnfolded] = useState<number | undefined>(undefined);
  // Only one round shows its categories at a time.
  const [expanded, setExpanded] = useState<number | undefined>(undefined);
  const unfold = (key: number | undefined) => {
    setUnfolded(key);
    setExpanded(undefined);
  };
  const [choosingAmbience, setChoosingAmbience] = useState(false);
  const [starting, setStarting] = useState<Starting>(() => ({
    ambience,
    settings,
    rounds: draftOf(rounds),
  }));
  // The round whose dilemma the host is choosing, over the settings.
  const [picking, setPicking] = useState<number | undefined>(undefined);
  const change = (changes: Partial<RoomSettingsDto>) => {
    const next = { ...draft, ...changes };
    // Making the room nominal turns compromising dilemmas off.
    if (next.variant === 'nominal') next.compromisingDilemmas = false;
    setDraft(next);
    setDraftRounds(
      draftRounds.map((round) =>
        round.origin === 'random' ? { ...round, content: allowedIn(next, round.content) } : round,
      ),
    );
  };
  const changeRound = (key: number, round: DraftRound) =>
    setDraftRounds(draftRounds.map((before) => (before.key === key ? round : before)));

  /** The dilemma a player chose for a round of the players, as the lobby has it now. */
  const chosenIn = (id: number | undefined) => {
    const round = rounds.find(({ roundId }) => roundId === id);
    return round?.origin === 'players' ? round.dilemma : null;
  };
  const dilemmaIdOf = (round: DraftRound) =>
    round.origin === 'specific'
      ? round.dilemma?.dilemmaId
      : round.origin === 'players'
        ? chosenIn(round.id)?.dilemmaId
        : undefined;

  const unfilled = draftRounds.some((round) => round.origin === 'specific' && !round.dilemma);
  const full = draftRounds.length >= MAXIMUM_ROUNDS;

  /** Sends what changed: the settings, and the rounds whole if any of them changed. */
  const save = () => {
    const changes: ChangeSettingsDto['changes'] = changesBetween(settings, draft);
    const after = settingsOf(draftRounds);
    if (JSON.stringify(after) !== JSON.stringify(settingsOf(draftOf(rounds)))) {
      changes.rounds = after;
    }
    if (Object.keys(changes).length > 0) onSave(changes);
    onClose();
  };

  /** A key for a round the host adds, below every key on screen. */
  const newKey = () => Math.min(0, ...draftRounds.map((round) => round.key)) - 1;
  /** A round the host adds comes unfolded, to set it at once. */
  const addRound = () => {
    const key = newKey();
    setDraftRounds([
      ...draftRounds,
      { key, id: undefined, origin: 'random', categories: null, content: ANY_CONTENT },
    ]);
    unfold(key);
  };

  /** The fields take what the ambience sets, as new rounds; the room takes it on saving. */
  const chooseAmbience = (option: AmbienceDto) => {
    const { variant, adultsOnly, compromisingDilemmas, rounds: preset } = ambiences[option];
    const first = newKey();
    const next = { ...draft, variant, adultsOnly, compromisingDilemmas };
    const nextRounds = preset.map(({ content }, index): DraftRound => ({
      key: first - index,
      id: undefined,
      origin: 'random',
      categories: null,
      content,
    }));
    setDraft(next);
    setDraftRounds(nextRounds);
    unfold(undefined);
    setStarting({ ambience: option, settings: next, rounds: nextRounds });
  };

  // What an ambience sets: once a field of those moves away from where the settings started, it
  // is custom.
  const movedAway =
    draft.variant !== starting.settings.variant ||
    draft.adultsOnly !== starting.settings.adultsOnly ||
    draft.compromisingDilemmas !== starting.settings.compromisingDilemmas ||
    JSON.stringify(settingsOf(draftRounds)) !== JSON.stringify(settingsOf(starting.rounds));
  const shownAmbience: AmbienceOrCustomDto = movedAway ? 'custom' : starting.ambience;

  const pickingIndex = draftRounds.findIndex(({ key }) => key === picking);
  const pickingRound = draftRounds[pickingIndex];

  return (
    <>
      <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className={sheet.overlay} />
          <Dialog.Content className={sheet.sheet} aria-describedby={undefined}>
            <div aria-hidden="true" className={sheet.handle} />
            <div className={sheet.top}>
              <Dialog.Title className={sheet.title}>{t('settings.title')}</Dialog.Title>
              <Dialog.Close className={sheet.close} aria-label={t('settings.close')}>
                <Icon name="close" />
              </Dialog.Close>
            </div>
            <div className={`${sheet.content} ${styles.content}`}>
              <div className={styles.ambienceCard}>
                <button
                  type="button"
                  className={styles.ambienceTop}
                  aria-expanded={choosingAmbience}
                  aria-controls="settings-ambiences"
                  onClick={() => setChoosingAmbience(!choosingAmbience)}
                >
                  <Icon name={AMBIENCE_ICONS[shownAmbience]} size={22} />
                  <span className={styles.ambienceNow}>
                    <span>
                      <span className={styles.ambienceLabel}>{t('settings.ambience.label')}</span>{' '}
                      {t(`ambience.${shownAmbience}.name`)}
                    </span>
                    <VariantBadges variant={draft.variant} withAnonymous />
                  </span>
                  <span className={styles.ambienceChange}>
                    {t('settings.ambience.change')}
                    <Icon name={choosingAmbience ? 'expandLess' : 'expandMore'} size={22} />
                  </span>
                </button>
                {choosingAmbience && (
                  <div id="settings-ambiences" className={styles.ambienceOptions}>
                    <span className={sheet.hint}>{t('settings.ambience.hint')}</span>
                    <div role="radiogroup" aria-label={t('settings.ambience.label')}>
                      {AMBIENCES.map((option) => {
                        const locked = hasPlayerUnderEighteen && isForAdults(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            role="radio"
                            aria-checked={shownAmbience === option}
                            disabled={locked}
                            className={styles.ambienceOption}
                            onClick={() => chooseAmbience(option)}
                          >
                            <span className={styles.ambienceOptionIcon}>
                              <Icon name={locked ? 'lock' : AMBIENCE_ICONS[option]} size={20} />
                            </span>
                            <span className={styles.ambienceOptionText}>
                              <span className={styles.ambienceOptionHead}>
                                <span className={styles.ambienceOptionName}>
                                  {t(`ambience.${option}.name`)}
                                </span>
                                <VariantBadges
                                  variant={variantOf(option)}
                                  withAnonymous
                                  off={locked}
                                />
                              </span>
                              <span className={sheet.hint}>
                                {locked ? t('ambience.minorInRoom') : t(`ambience.${option}.line`)}
                              </span>
                            </span>
                            {!locked && (
                              <Icon
                                name={shownAmbience === option ? 'checkCircle' : 'radioUnchecked'}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <fieldset className={styles.group}>
                <legend className={styles.legend}>{t('settings.reveal')}</legend>
                <div className={styles.segmented}>
                  {(['nominal', 'anonymous'] as const).map((variant) => (
                    <label key={variant} className={`${styles.segment} ${styles.variantSegment}`}>
                      <input
                        type="radio"
                        name="variant"
                        checked={draft.variant === variant}
                        aria-describedby={`${minimumId}-${variant}`}
                        onChange={() => change({ variant })}
                      />
                      <span className={styles.variantName}>
                        <Icon
                          name={variant === 'nominal' ? 'visibility' : 'visibilityOff'}
                          size={18}
                        />
                        {t(`settings.${variant}`)}
                      </span>
                      <span
                        id={`${minimumId}-${variant}`}
                        aria-hidden="true"
                        className={styles.variantMinimum}
                        data-testid={`minimum-players-${variant}`}
                      >
                        {t('badges.players', { minimum: MINIMUM_PLAYERS[variant] })}
                      </span>
                    </label>
                  ))}
                </div>
                <span className={sheet.hint}>
                  {t(
                    draft.variant === 'nominal' ? 'settings.nominalHint' : 'settings.anonymousHint',
                  )}
                </span>
              </fieldset>

              <label className={styles.switch}>
                <span className={styles.switchText}>
                  <span className={styles.switchLabel}>{t('settings.adultsOnly.label')}</span>
                  <span className={sheet.hint}>
                    {hasPlayerUnderEighteen && !draft.adultsOnly
                      ? t('ambience.minorInRoom')
                      : t('settings.adultsOnly.hint')}
                  </span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={draft.adultsOnly}
                  disabled={hasPlayerUnderEighteen && !draft.adultsOnly}
                  onChange={(event) => change({ adultsOnly: event.target.checked })}
                />
              </label>

              <label className={styles.switch}>
                <span className={styles.switchText}>
                  <span className={styles.switchLabel}>{t('settings.compromising.label')}</span>
                  <span className={sheet.hint}>
                    {draft.variant === 'anonymous'
                      ? t('settings.compromising.hint')
                      : t('settings.compromising.onlyAnonymous')}
                  </span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={draft.compromisingDilemmas}
                  disabled={draft.variant !== 'anonymous'}
                  onChange={(event) => change({ compromisingDilemmas: event.target.checked })}
                />
              </label>

              <fieldset className={styles.group}>
                <legend className={styles.legend}>{t('settings.timePerDilemma')}</legend>
                <div className={styles.options}>
                  {TIMES_PER_DILEMMA.map((timePerDilemmaSeconds) => (
                    <label key={timePerDilemmaSeconds} className={styles.option}>
                      <input
                        type="radio"
                        name="timePerDilemma"
                        checked={draft.timePerDilemmaSeconds === timePerDilemmaSeconds}
                        onChange={() => change({ timePerDilemmaSeconds })}
                      />
                      {t('settings.seconds', { count: timePerDilemmaSeconds })}
                    </label>
                  ))}
                </div>
                <span className={sheet.hint}>{t('settings.timeHint')}</span>
              </fieldset>

              <section className={styles.roundsSection} aria-labelledby="settings-rounds">
                <div className={styles.roundsTop}>
                  <h2 id="settings-rounds" className={styles.legend}>
                    {t('settings.rounds.title', { count: draftRounds.length })}
                  </h2>
                  <span className={sheet.hint}>
                    {t('settings.rounds.range', { maximum: MAXIMUM_ROUNDS })}
                  </span>
                </div>
                <span className={sheet.hint}>{t('settings.rounds.hint')}</span>
                {draft.adultsOnly !== draft.compromisingDilemmas && (
                  <p className={styles.contentHint}>
                    <Icon name="info" size={20} />
                    <span>
                      {t(
                        draft.adultsOnly
                          ? 'settings.content.needsCompromising'
                          : 'settings.content.needsAdults',
                      )}
                    </span>
                  </p>
                )}
                <ol className={styles.rounds}>
                  {draftRounds.map((round, index) => (
                    <RoundCard
                      key={round.key}
                      round={round}
                      number={index + 1}
                      only={draftRounds.length === 1}
                      settings={draft}
                      chosen={chosenIn(round.id)}
                      unfolded={unfolded === round.key}
                      onUnfold={(open) => unfold(open ? round.key : undefined)}
                      expanded={expanded === round.key}
                      onExpand={(open) => setExpanded(open ? round.key : undefined)}
                      onChange={(changed) => changeRound(round.key, changed)}
                      onRemove={() => {
                        setDraftRounds(draftRounds.filter(({ key }) => key !== round.key));
                        unfold(undefined);
                      }}
                      onPick={() => setPicking(round.key)}
                    />
                  ))}
                </ol>
                <button
                  type="button"
                  className={styles.addRound}
                  disabled={full}
                  onClick={addRound}
                >
                  <Icon name="add" size={22} />
                  {full
                    ? t('settings.rounds.full', { maximum: MAXIMUM_ROUNDS })
                    : t('settings.rounds.add')}
                </button>
              </section>

              <label className={styles.switch}>
                <span className={styles.switchText}>
                  <span className={styles.switchLabel}>{t('settings.newDilemmas.label')}</span>
                  <span className={sheet.hint}>{t('settings.newDilemmas.hint')}</span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={draft.newDilemmas}
                  onChange={(event) => change({ newDilemmas: event.target.checked })}
                />
              </label>
            </div>
            <div className={sheet.footer}>
              <button type="button" className={sheet.primary} disabled={unfilled} onClick={save}>
                {t('settings.save')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {pickingRound && (
        <PickRoundDilemmaSheet
          roomId={roomId}
          roundNumber={pickingIndex + 1}
          current={dilemmaIdOf(pickingRound)}
          taken={roundNumbersByDilemma(
            draftRounds.map((round) => (round === pickingRound ? undefined : dilemmaIdOf(round))),
          )}
          onPick={({ dilemmaId, text, category, optionCount }) =>
            changeRound(pickingRound.key, {
              key: pickingRound.key,
              id: pickingRound.id,
              origin: 'specific',
              dilemma: {
                dilemmaId,
                text,
                meta: [
                  t(`categories.${category}`, { defaultValue: category }),
                  t('pickDilemmas.options', { count: optionCount }),
                ].join(' · '),
              },
            })
          }
          onClose={() => setPicking(undefined)}
        />
      )}
    </>
  );
}

interface RoundCardProps {
  readonly round: DraftRound;
  /** The settings on screen, which decide the contents a random round may have. */
  readonly settings: RoomSettingsDto;
  /** From 1, in the order the game plays them. */
  readonly number: number;
  /** The only round left, which the host cannot remove. */
  readonly only: boolean;
  /** For a round of the players, the dilemma one of them already chose. */
  readonly chosen: { readonly dilemmaId: string; readonly text: string } | null;
  /** Whether the round shows what the host sets, or only its summary line. */
  readonly unfolded: boolean;
  readonly onUnfold: (open: boolean) => void;
  /** Whether a random round shows the chips of its categories. */
  readonly expanded: boolean;
  readonly onExpand: (open: boolean) => void;
  readonly onChange: (round: DraftRound) => void;
  readonly onRemove: () => void;
  readonly onPick: () => void;
}

/**
 * A round of the settings, folded into a line with its number, where its dilemma comes from and
 * its content; unfolded, what the host sets by its origin, the way to remove it and «Listo».
 */
function RoundCard({
  round,
  settings,
  number,
  only,
  chosen,
  unfolded,
  onUnfold,
  expanded,
  onExpand,
  onChange,
  onRemove,
  onPick,
}: RoundCardProps) {
  const { t } = useTranslation();
  const say = t as unknown as Translate;
  const bodyId = useId();
  const categoriesId = useId();
  const someone = t('pickDilemmas.someone');
  const icon = ORIGINS.find(([origin]) => origin === round.origin)![1];

  return (
    <li className={styles.round} data-unfolded={unfolded || undefined}>
      <button
        type="button"
        className={styles.roundHead}
        aria-expanded={unfolded}
        aria-controls={bodyId}
        onClick={() => onUnfold(!unfolded)}
      >
        <span aria-hidden="true" className={styles.roundNumber} data-testid="round-number">
          {number}
        </span>
        <span className={styles.roundSummary}>
          <span className={styles.roundOrigin}>
            <span className={styles.hidden}>{t('settings.rounds.round', { number })} </span>
            <Icon name={icon} size={18} />
            {t(`settings.rounds.origins.${round.origin}`)}
          </span>
          <span className={styles.roundLine} data-testid="round-summary">
            {summaryOf(round, settings, chosen, someone, say)}
          </span>
        </span>
        <Icon name={unfolded ? 'expandLess' : 'expandMore'} size={22} />
      </button>

      {unfolded && (
        <div id={bodyId} className={styles.roundBody}>
          <div className={styles.roundTop}>
            <div
              className={styles.origins}
              role="radiogroup"
              aria-label={t('settings.rounds.origin', { number })}
            >
              {ORIGINS.map(([origin, originIcon]) => (
                <button
                  key={origin}
                  type="button"
                  role="radio"
                  aria-checked={round.origin === origin}
                  className={styles.origin}
                  onClick={() => round.origin !== origin && onChange(withOrigin(round, origin))}
                >
                  <Icon name={originIcon} size={20} />
                  {t(`settings.rounds.origins.${origin}`)}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={styles.removeRound}
              aria-label={t('settings.rounds.remove', { number })}
              disabled={only}
              onClick={onRemove}
            >
              <Icon name="close" size={22} />
            </button>
          </div>

          {round.origin === 'random' && (
            <>
              <button
                type="button"
                className={styles.expander}
                aria-expanded={expanded}
                aria-controls={categoriesId}
                aria-label={t('settings.rounds.categoriesOf', {
                  number,
                  summary: fromCategories(round.categories, say),
                })}
                onClick={() => onExpand(!expanded)}
              >
                <span>{fromCategories(round.categories, say)}</span>
                <Icon name={expanded ? 'expandLess' : 'expandMore'} size={22} />
              </button>
              {expanded && (
                <div
                  id={categoriesId}
                  className={styles.chips}
                  role="group"
                  aria-label={t('settings.rounds.categories', { number })}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={round.categories === null}
                    className={styles.chip}
                    onClick={() => onChange({ ...round, categories: null })}
                  >
                    {t('settings.rounds.allCategories')}
                  </button>
                  {CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      role="checkbox"
                      aria-checked={round.categories?.includes(category) ?? false}
                      className={styles.chip}
                      onClick={() =>
                        onChange({
                          ...round,
                          categories: toggledCategory(round.categories, category),
                        })
                      }
                    >
                      {t(`categories.${category}`)}
                    </button>
                  ))}
                </div>
              )}
              {allows(settings, 'age') && (
                <AxisChoice
                  label={t('settings.content.age.label')}
                  icon="adultsOnly"
                  options={[
                    ['any', t('settings.content.age.any')],
                    ['from-16', t('settings.content.age.from-16')],
                    ['adults-only', t('settings.content.age.adults-only')],
                  ]}
                  value={round.content.age}
                  onChange={(age) => onChange({ ...round, content: { ...round.content, age } })}
                />
              )}
              {allows(settings, 'compromising') && (
                <AxisChoice
                  label={t('settings.content.compromising.label')}
                  icon="heartBroken"
                  options={[
                    ['any', t('settings.content.compromising.any')],
                    ['no', t('settings.content.compromising.no')],
                    ['yes', t('settings.content.compromising.yes')],
                  ]}
                  value={round.content.compromising}
                  onChange={(compromising) =>
                    onChange({ ...round, content: { ...round.content, compromising } })
                  }
                />
              )}
            </>
          )}

          {round.origin === 'specific' &&
            (round.dilemma ? (
              <div className={styles.specific}>
                <span className={styles.specificText}>
                  <span className={styles.specificTitle}>
                    <DilemmaText text={round.dilemma.text} personInTheGap={someone} />
                  </span>
                  {round.dilemma.meta && <span className={sheet.hint}>{round.dilemma.meta}</span>}
                </span>
                <button
                  type="button"
                  className={styles.change}
                  aria-label={t('settings.rounds.changeLabel', { number })}
                  onClick={onPick}
                >
                  {t('settings.rounds.change')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.choose}
                aria-label={t('settings.rounds.chooseLabel', { number })}
                onClick={onPick}
              >
                {t('settings.rounds.choose')}
                <Icon name="chevronRight" size={22} />
              </button>
            ))}

          {round.origin === 'players' && (
            <p className={styles.players}>
              <Icon name="groupsOutline" size={20} />
              <span>
                {chosen
                  ? t('settings.rounds.playersChosen', {
                      title: chosen.text.replaceAll(GAP_MARKER, someone),
                    })
                  : t('settings.rounds.playersHint')}
              </span>
            </p>
          )}

          <button type="button" className={styles.done} onClick={() => onUnfold(false)}>
            <Icon name="check" size={20} />
            {t('settings.rounds.done')}
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * The line a folded round reads: the categories and the content that is not «Da igual» of a
 * random round, the dilemma of a specific one or that it is still to choose, and who chooses one
 * of the players.
 */
function summaryOf(
  round: DraftRound,
  settings: RoomSettingsDto,
  chosen: { readonly text: string } | null,
  someone: string,
  t: Translate,
): string {
  switch (round.origin) {
    case 'specific':
      return round.dilemma
        ? t('settings.rounds.summary.specific', {
            title: round.dilemma.text.replaceAll(GAP_MARKER, someone),
          })
        : t('settings.rounds.summary.missingDilemma');
    case 'players':
      return chosen
        ? t('settings.rounds.summary.playersChosen', {
            title: chosen.text.replaceAll(GAP_MARKER, someone),
          })
        : t('settings.rounds.summary.players');
    case 'random': {
      const { age, compromising } = allowedIn(settings, round.content);
      return [
        fromCategories(round.categories, t),
        age === 'any' ? undefined : t(`settings.content.age.${age}`),
        compromising === 'no' ? t('settings.rounds.summary.notCompromising') : undefined,
        compromising === 'yes' ? t('settings.content.compromising.label') : undefined,
      ]
        .filter((part) => part !== undefined)
        .join(' · ');
    }
  }
}

/** The translation of a key, as the screens use it here. */
type Translate = (key: string, options?: Readonly<Record<string, unknown>>) => string;

/** «De todas las categorías», «De Honestidad», «De Honestidad o Lealtad» or «De 3 categorías». */
function fromCategories(categories: readonly Category[] | null, t: Translate): string {
  if (categories === null) return t('settings.rounds.fromAll');
  const [first, second] = categories.map((category) => t(`categories.${category}`));
  if (categories.length === 1) return t('settings.rounds.fromOne', { category: first });
  if (categories.length === 2) return t('settings.rounds.fromTwo', { first, second });
  return t('settings.rounds.fromSome', { count: categories.length });
}

interface AxisChoiceProps<T extends string> {
  readonly label: string;
  readonly icon: IconName;
  /** Each option with its text, in the order the screen offers them. */
  readonly options: readonly (readonly [T, string])[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

/** One part of the content of a random round: its age, or whether compromising. */
function AxisChoice<T extends string>({
  label,
  icon,
  options,
  value,
  onChange,
}: AxisChoiceProps<T>) {
  const labelId = useId();
  return (
    <div className={styles.axis}>
      <span id={labelId} className={styles.axisLabel}>
        <Icon name={icon} size={16} />
        {label}
      </span>
      <div className={styles.axisOptions} role="radiogroup" aria-labelledby={labelId}>
        {options.map(([option, text]) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            className={styles.axisOption}
            onClick={() => onChange(option)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
