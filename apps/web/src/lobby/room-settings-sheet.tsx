import { LanguageDto, type RoomSettingsDto } from '@thelever-app/protocol';
import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { CATEGORIES } from './categories.ts';
import styles from './room-settings-sheet.module.css';
import sheet from './sheet.module.css';

interface RoomSettingsSheetProps {
  readonly settings: RoomSettingsDto;
  /** How many dilemmas the host picked by hand; none, and the game goes by categories. */
  readonly pickedCount: number;
  /** Only what changed; never empty. */
  readonly onSave: (changes: Partial<RoomSettingsDto>) => void;
  /** The host leaves the dilemmas they picked, to play by categories again. */
  readonly onPlayByCategories: () => void;
  readonly onPickDilemmas: () => void;
  readonly onClose: () => void;
}

type Mode = 'categories' | 'hand';

const DILEMMA_COUNTS = [6, 8, 10, 12] as const;
const TOTAL_TIMES = [4, 6, 8, 10] as const;
const DILEMMAS_PER_PLAYER = [0, 1, 2, 3] as const;

/** What changed between the settings the room has and the ones on screen. */
function changesBetween(before: RoomSettingsDto, after: RoomSettingsDto): Partial<RoomSettingsDto> {
  return Object.fromEntries(
    Object.entries(after).filter(
      // The categories are a list: they change when another one is marked, not another array.
      ([key, value]) =>
        JSON.stringify(before[key as keyof RoomSettingsDto]) !== JSON.stringify(value),
    ),
  ) as Partial<RoomSettingsDto>;
}

/**
 * The categories marked, in the order the screen offers them. From every category (null),
 * marking one plays only that one; unmarking the last one plays none.
 */
function toggled(categories: readonly string[] | null, category: string): string[] {
  const before = categories ?? [];
  const marked = before.includes(category)
    ? before.filter((marked) => marked !== category)
    : [...before, category];
  return CATEGORIES.filter((known) => marked.includes(known));
}

/** The host changes the configuration of the room before starting. */
export function RoomSettingsSheet({
  settings,
  pickedCount,
  onSave,
  onPlayByCategories,
  onPickDilemmas,
  onClose,
}: RoomSettingsSheetProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(settings);
  const [mode, setMode] = useState<Mode>(pickedCount > 0 ? 'hand' : 'categories');
  const change = (changes: Partial<RoomSettingsDto>) => setDraft({ ...draft, ...changes });

  /** Sends what changed: the settings, and leaving the picked dilemmas if the host went back. */
  const send = () => {
    const changes = changesBetween(settings, draft);
    if (Object.keys(changes).length > 0) onSave(changes);
    if (mode === 'categories' && pickedCount > 0) onPlayByCategories();
  };
  const save = () => {
    send();
    onClose();
  };
  // Picking happens in a sheet of its own: what the host changed here is kept first.
  const pick = () => {
    send();
    onPickDilemmas();
  };

  return (
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
                {t(draft.variant === 'nominal' ? 'settings.nominalHint' : 'settings.anonymousHint')}
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
            </label>

            <fieldset className={`${styles.group} ${styles.section}`}>
              <legend className={styles.legend}>{t('settings.howPicked')}</legend>
              <div className={styles.segmented}>
                {(['categories', 'hand'] as const).map((option) => (
                  <label key={option} className={styles.segment}>
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === option}
                      onChange={() => setMode(option)}
                    />
                    {t(option === 'categories' ? 'settings.byCategories' : 'settings.byHand')}
                  </label>
                ))}
              </div>
            </fieldset>

            {mode === 'categories' ? (
              <>
                <div className={styles.group}>
                  <span className={styles.legend} id="settings-categories">
                    {t('settings.categories')}
                  </span>
                  <div className={styles.chips} role="group" aria-labelledby="settings-categories">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={draft.categories === null}
                      className={styles.chip}
                      onClick={() => change({ categories: null })}
                    >
                      {t('settings.allCategories')}
                    </button>
                    {CATEGORIES.map((category) => (
                      <button
                        key={category}
                        type="button"
                        role="checkbox"
                        aria-checked={draft.categories?.includes(category) ?? false}
                        className={styles.chip}
                        onClick={() => change({ categories: toggled(draft.categories, category) })}
                      >
                        {t(`categories.${category}`)}
                      </button>
                    ))}
                  </div>
                  <span className={sheet.hint}>{t('settings.categoriesHint')}</span>
                </div>

                <fieldset className={styles.group}>
                  <legend className={styles.legend}>{t('settings.dilemmaCount')}</legend>
                  <div className={styles.options}>
                    {DILEMMA_COUNTS.map((dilemmaCount) => (
                      <label key={dilemmaCount} className={styles.option}>
                        <input
                          type="radio"
                          name="dilemmaCount"
                          checked={draft.dilemmaCount === dilemmaCount}
                          onChange={() => change({ dilemmaCount })}
                        />
                        {dilemmaCount}
                      </label>
                    ))}
                  </div>
                </fieldset>

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

                <button type="button" className={styles.link} onClick={pick}>
                  {t('settings.pick')}
                  <Icon name="chevronRight" size={20} />
                </button>
              </>
            ) : (
              <div className={styles.group}>
                <div className={styles.picked}>
                  <span className={styles.switchLabel}>
                    {pickedCount > 0
                      ? t('settings.picked', { count: pickedCount })
                      : t('settings.noPicked')}
                  </span>
                  <button type="button" className={styles.change} onClick={pick}>
                    {pickedCount > 0 ? t('settings.changePicked') : t('settings.choosePicked')}
                  </button>
                </div>
                <span className={sheet.hint}>{t('settings.byHandHint')}</span>
              </div>
            )}

            <fieldset className={styles.group}>
              <legend className={styles.legend}>{t('settings.totalTime')}</legend>
              <div className={styles.options}>
                {TOTAL_TIMES.map((totalTimeInMinutes) => (
                  <label key={totalTimeInMinutes} className={styles.option}>
                    <input
                      type="radio"
                      name="totalTime"
                      checked={draft.totalTimeInMinutes === totalTimeInMinutes}
                      onChange={() => change({ totalTimeInMinutes })}
                    />
                    {t('settings.minutes', { count: totalTimeInMinutes })}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className={`${styles.group} ${styles.section}`}>
              <legend className={styles.legend}>{t('settings.dilemmasPerPlayer.label')}</legend>
              <div
                className={styles.options}
                role="radiogroup"
                aria-label={t('settings.dilemmasPerPlayer.label')}
              >
                {DILEMMAS_PER_PLAYER.map((dilemmasPerPlayer) => (
                  <label key={dilemmasPerPlayer} className={styles.option}>
                    <input
                      type="radio"
                      name="dilemmasPerPlayer"
                      checked={draft.dilemmasPerPlayer === dilemmasPerPlayer}
                      onChange={() => change({ dilemmasPerPlayer })}
                    />
                    {dilemmasPerPlayer === 0
                      ? t('settings.dilemmasPerPlayer.none')
                      : dilemmasPerPlayer}
                  </label>
                ))}
              </div>
              <span className={sheet.hint}>{t('settings.dilemmasPerPlayer.hint')}</span>
            </fieldset>
          </div>
          <button type="button" className={sheet.primary} onClick={save}>
            {t('settings.save')}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
