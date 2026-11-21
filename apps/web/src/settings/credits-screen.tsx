import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import screen from '../screens/screen.module.css';
import { SettingsHeader } from './settings-header.tsx';
import { NOTICES_PATH, SETTINGS_PATH, SOURCE_CODE_URL } from './settings-paths.ts';
import styles from './settings.module.css';

/** The credits of what TheLever uses and is not its own, in the order the screen shows them. */
const CREDITS = ['fonts', 'icons', 'avatars', 'mascot', 'country'] as const;

/** /settings/credits: who made what TheLever uses, the notices of its libraries and its source code. */
export function CreditsScreen() {
  const { t } = useTranslation();
  return (
    <div className={screen.screen}>
      <SettingsHeader title={t('credits.title')} back={SETTINGS_PATH} />
      <main className={styles.cards}>
        {CREDITS.map((credit) => (
          <section key={credit} className={styles.card}>
            <h2 className={styles.cardTitle}>{t(`credits.${credit}.title`)}</h2>
            <p className={styles.cardText}>{t(`credits.${credit}.text`)}</p>
          </section>
        ))}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{t('credits.libraries.title')}</h2>
          <p className={styles.cardText}>{t('credits.libraries.text')}</p>
          <Link className={styles.cardLink} to={NOTICES_PATH}>
            {t('credits.libraries.link')}
          </Link>
        </section>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{t('credits.code.title')}</h2>
          <p className={styles.cardText}>{t('credits.code.text')}</p>
          <a
            className={styles.cardLink}
            href={SOURCE_CODE_URL}
            target="_blank"
            rel="noopener"
            aria-label={t('appSettings.outside', { name: t('credits.code.link') })}
          >
            {t('credits.code.link')}
          </a>
        </section>
      </main>
    </div>
  );
}
