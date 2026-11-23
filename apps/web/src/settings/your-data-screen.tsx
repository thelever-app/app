import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { useRoomApi } from '../room/room-api-context.tsx';
import screen from '../screens/screen.module.css';
import { SettingsHeader } from './settings-header.tsx';
import { CONTACT_EMAIL, SETTINGS_PATH } from './settings-paths.ts';
import styles from './settings.module.css';

/**
 * /settings/your-data: how to ask for a copy of the data, or to correct one, by email, and the code
 * that proves the request is of this player, who has no account.
 */
export function YourDataScreen() {
  const { t } = useTranslation();
  const api = useRoomApi();
  const [code, setCode] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    api.myData().then(
      ({ requestCode }) => active && setCode(requestCode),
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, [api]);

  const copy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(
      () => setCopied(true),
      // Without the clipboard the code is still there to select.
      () => {},
    );
  };

  return (
    <div className={screen.screen}>
      <SettingsHeader title={t('yourData.title')} back={SETTINGS_PATH} />
      <main className={styles.cards}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{t('yourData.emailTitle')}</h2>
          <p className={styles.cardText}>{t('yourData.emailText', { email: CONTACT_EMAIL })}</p>
          <p className={styles.cardText}>{t('yourData.codeText')}</p>
          {failed && (
            <p className={styles.cardText} role="alert">
              {t('yourData.failed')}
            </p>
          )}
          {code && (
            <p className={styles.code}>
              <span className={styles.codeValue}>{code}</span>
              <button
                type="button"
                className={styles.copy}
                aria-label={copied ? t('yourData.copied') : t('yourData.copy')}
                onClick={copy}
              >
                <Icon name={copied ? 'check' : 'contentCopy'} size={22} />
              </button>
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
