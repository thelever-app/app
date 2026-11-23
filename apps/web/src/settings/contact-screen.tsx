import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Icon } from '../components/icon.tsx';
import screen from '../screens/screen.module.css';
import { SettingsHeader } from './settings-header.tsx';
import { CONTACT_EMAIL, ILLEGAL_CONTENT_PATH, SETTINGS_PATH } from './settings-paths.ts';
import styles from './settings.module.css';

/**
 * /settings/contact: the email of users and authorities, the languages it is answered in, the web
 * form of illegal content and how to appeal a decision.
 */
export function ContactScreen() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(CONTACT_EMAIL).then(
      () => setCopied(true),
      // Without the clipboard the email is still there to select.
      () => {},
    );
  };

  return (
    <div className={screen.screen}>
      <SettingsHeader title={t('contact.title')} back={SETTINGS_PATH} />
      <main className={styles.cards}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{t('contact.writeTitle')}</h2>
          <p className={styles.cardText}>{t('contact.writeText')}</p>
          <p className={styles.email}>
            <span className={styles.emailAddress}>{CONTACT_EMAIL}</span>
            <button
              type="button"
              className={styles.copy}
              aria-label={copied ? t('contact.copied') : t('contact.copy')}
              onClick={copy}
            >
              <Icon name={copied ? 'check' : 'contentCopy'} size={22} />
            </button>
          </p>
        </section>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{t('contact.reportTitle')}</h2>
          <p className={styles.cardText}>{t('contact.reportText')}</p>
          <Link className={styles.cardLink} to={ILLEGAL_CONTENT_PATH}>
            {t('contact.openForm')}
          </Link>
        </section>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{t('contact.appealTitle')}</h2>
          <p className={styles.cardText}>{t('contact.appealText')}</p>
        </section>
      </main>
    </div>
  );
}
