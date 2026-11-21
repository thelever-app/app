import type { LanguageDto } from '@thelever-app/protocol';
import { Dialog } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { SUPPORTED_LANGUAGES } from '../i18n/i18n.ts';
import { chooseLanguage } from '../i18n/language-preference.ts';
import sheet from '../game/sheet.module.css';
import styles from './settings.module.css';

/** Each language of the app by its own name, as whoever reads it would look for it. */
export const LANGUAGE_NAMES: Readonly<Record<LanguageDto, string>> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  ca: 'Català',
};

interface LanguageSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/** The language of the app: chosen, it is shown at once and kept on the device. */
export function LanguageSheet({ open, onOpenChange }: LanguageSheetProps) {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage;
  // The sheet closes once the screen behind it reads in the language chosen, never before.
  const choose = (language: LanguageDto) => {
    chooseLanguage(language);
    void i18n.changeLanguage(language).finally(() => onOpenChange(false));
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={sheet.overlay} />
        <Dialog.Content className={sheet.sheet} aria-describedby={undefined}>
          <div aria-hidden="true" className={sheet.handle} />
          <Dialog.Title className={styles.sheetTitle}>{t('appSettings.language')}</Dialog.Title>
          <div role="radiogroup" aria-label={t('appSettings.language')} className={styles.choices}>
            {SUPPORTED_LANGUAGES.map((language) => (
              <button
                key={language}
                type="button"
                role="radio"
                aria-checked={language === current}
                lang={language}
                className={styles.choice}
                onClick={() => choose(language)}
              >
                {LANGUAGE_NAMES[language]}
                {language === current && <Icon name="check" size={20} />}
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
