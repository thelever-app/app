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
  /** Only what changed; never empty. */
  readonly onSave: (changes: Partial<RoomSettingsDto>) => void;
  readonly onPickDilemmas: () => void;
  readonly onClose: () => void;
}

const DILEMMA_COUNTS = [6, 8, 10, 12] as const;
const TOTAL_TIMES = [4, 6, 8, 10] as const;

/** What changed between the settings the room has and the ones on screen. */
function changesBetween(before: RoomSettingsDto, after: RoomSettingsDto): Partial<RoomSettingsDto> {
  return Object.fromEntries(
    Object.entries(after).filter(([key, value]) => before[key as keyof RoomSettingsDto] !== value),
  ) as Partial<RoomSettingsDto>;
}

/** The host changes the configuration of the room before starting. */
export function RoomSettingsSheet({
  settings,
  onSave,
  onPickDilemmas,
  onClose,
}: RoomSettingsSheetProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(settings);
  const change = (changes: Partial<RoomSettingsDto>) => setDraft({ ...draft, ...changes });

  const save = () => {
    const changes = changesBetween(settings, draft);
    if (Object.keys(changes).length > 0) onSave(changes);
    onClose();
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
          <div className={sheet.content}>
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

            <div className={styles.selects}>
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
              <label className={styles.select}>
                {t('settings.category')}
                <select
                  value={draft.category}
                  onChange={(event) => change({ category: event.target.value })}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {t(`categories.${category}`)}
                    </option>
                  ))}
                </select>
              </label>
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

            <label className={styles.switch}>
              <span className={styles.switchText}>
                <span className={styles.switchLabel}>
                  {t('settings.playersCanAddDilemmas.label')}
                </span>
                <span className={sheet.hint}>{t('settings.playersCanAddDilemmas.hint')}</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={draft.playersCanAddDilemmas}
                onChange={(event) => change({ playersCanAddDilemmas: event.target.checked })}
              />
            </label>

            <button type="button" className={styles.link} onClick={onPickDilemmas}>
              {t('settings.pick')}
              <Icon name="chevronRight" size={20} />
            </button>
          </div>
          <button type="button" className={sheet.primary} onClick={save}>
            {t('settings.save')}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
