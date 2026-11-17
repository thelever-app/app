import {
  type ChangeSettingsDto,
  GAP_MARKER,
  LanguageDto,
  type LobbyRoundDto,
  MAXIMUM_ROUNDS,
  type RoomSettingsDto,
  type RoundSettingsDto,
} from '@thelever-app/protocol';
import { Dialog } from 'radix-ui';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../components/icon.tsx';
import { DilemmaText } from '../game/dilemma-text.tsx';
import { CATEGORIES, type Category } from './categories.ts';
import { PickRoundDilemmaSheet } from './pick-round-dilemma-sheet.tsx';
import { roundNumbersByDilemma, toggledCategory } from './rounds.ts';
import styles from './room-settings-sheet.module.css';
import sheet from './sheet.module.css';

interface RoomSettingsSheetProps {
  readonly roomId: string;
  readonly settings: RoomSettingsDto;
  /** The rounds of the room as the lobby has them now, with what the players chose. */
  readonly rounds: readonly LobbyRoundDto[];
  /** Only what changed, the rounds whole; never empty. */
  readonly onSave: (changes: ChangeSettingsDto['changes']) => void;
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
        return { key: roundId, id: roundId, origin: 'random', categories: round.categories };
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
        return [{ ...id, origin: 'random', categories: round.categories && [...round.categories] }];
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
      return { key, id, origin, categories: null };
    case 'specific':
      return { key, id, origin, dilemma: undefined };
    case 'players':
      return { key, id, origin };
  }
}

/** The host changes the configuration of the room and its rounds before starting. */
export function RoomSettingsSheet({
  roomId,
  settings,
  rounds,
  onSave,
  onClose,
}: RoomSettingsSheetProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(settings);
  const [draftRounds, setDraftRounds] = useState(() => draftOf(rounds));
  // Only one round shows its categories at a time.
  const [expanded, setExpanded] = useState<number | undefined>(undefined);
  // The round whose dilemma the host is choosing, over the settings.
  const [picking, setPicking] = useState<number | undefined>(undefined);
  const change = (changes: Partial<RoomSettingsDto>) => setDraft({ ...draft, ...changes });
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

  const addRound = () => {
    const key = Math.min(0, ...draftRounds.map((round) => round.key)) - 1;
    setDraftRounds([...draftRounds, { key, id: undefined, origin: 'random', categories: null }]);
  };

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
              <fieldset className={styles.group}>
                <legend className={styles.legend}>{t('settings.reveal')}</legend>
                <div className={styles.segmented}>
                  {(['nominal', 'anonymous'] as const).map((variant) => (
                    <label key={variant} className={styles.segment}>
                      <input
                        type="radio"
                        name="variant"
                        checked={draft.variant === variant}
                        onChange={() => change({ variant })}
                      />
                      {t(`settings.${variant}`)}
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
                  <span className={sheet.hint}>{t('settings.adultsOnly.hint')}</span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={draft.adultsOnly}
                  onChange={(event) => change({ adultsOnly: event.target.checked })}
                />
              </label>

              <label className={styles.select}>
                {t('settings.language')}
                <span className={styles.selectField}>
                  <select
                    value={draft.dilemmaLanguage}
                    onChange={(event) =>
                      change({ dilemmaLanguage: LanguageDto.parse(event.target.value) })
                    }
                  >
                    {LanguageDto.options.map((language) => (
                      <option key={language} value={language}>
                        {t(`languages.${language}`)}
                      </option>
                    ))}
                  </select>
                  <span className={styles.selectArrow}>
                    <Icon name="expandMore" size={22} />
                  </span>
                </span>
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
                <ol className={styles.rounds}>
                  {draftRounds.map((round, index) => (
                    <RoundCard
                      key={round.key}
                      round={round}
                      number={index + 1}
                      only={draftRounds.length === 1}
                      chosen={chosenIn(round.id)}
                      expanded={expanded === round.key}
                      onExpand={(open) => setExpanded(open ? round.key : undefined)}
                      onChange={(changed) => changeRound(round.key, changed)}
                      onRemove={() =>
                        setDraftRounds(draftRounds.filter(({ key }) => key !== round.key))
                      }
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
  /** From 1, in the order the game plays them. */
  readonly number: number;
  /** The only round left, which the host cannot remove. */
  readonly only: boolean;
  /** For a round of the players, the dilemma one of them already chose. */
  readonly chosen: { readonly dilemmaId: string; readonly text: string } | null;
  readonly expanded: boolean;
  readonly onExpand: (open: boolean) => void;
  readonly onChange: (round: DraftRound) => void;
  readonly onRemove: () => void;
  readonly onPick: () => void;
}

/** A round of the settings: where its dilemma comes from and, by its origin, what the host sets. */
function RoundCard({
  round,
  number,
  only,
  chosen,
  expanded,
  onExpand,
  onChange,
  onRemove,
  onPick,
}: RoundCardProps) {
  const { t } = useTranslation();
  const categoriesId = useId();
  const someone = t('pickDilemmas.someone');

  return (
    <li className={styles.round}>
      <div className={styles.roundTop}>
        <span aria-hidden="true" className={styles.roundNumber}>
          {number}
        </span>
        <div
          className={styles.origins}
          role="radiogroup"
          aria-label={t('settings.rounds.origin', { number })}
        >
          {ORIGINS.map(([origin, icon]) => (
            <button
              key={origin}
              type="button"
              role="radio"
              aria-checked={round.origin === origin}
              className={styles.origin}
              onClick={() => round.origin !== origin && onChange(withOrigin(round, origin))}
            >
              <Icon name={icon} size={20} />
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
              summary: fromCategories(round.categories, t),
            })}
            onClick={() => onExpand(!expanded)}
          >
            <span>{fromCategories(round.categories, t)}</span>
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
                    onChange({ ...round, categories: toggledCategory(round.categories, category) })
                  }
                >
                  {t(`categories.${category}`)}
                </button>
              ))}
            </div>
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
    </li>
  );
}

type Translate = ReturnType<typeof useTranslation>['t'];

/** «De todas las categorías», «De Honestidad», «De Honestidad o Lealtad» or «De 3 categorías». */
function fromCategories(categories: readonly Category[] | null, t: Translate): string {
  if (categories === null) return t('settings.rounds.fromAll');
  const [first, second] = categories.map((category) => t(`categories.${category}`));
  if (categories.length === 1) return t('settings.rounds.fromOne', { category: first });
  if (categories.length === 2) return t('settings.rounds.fromTwo', { first, second });
  return t('settings.rounds.fromSome', { count: categories.length });
}
