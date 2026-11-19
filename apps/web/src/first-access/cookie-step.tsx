import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import screen from '../screens/screen.module.css';
import {
  askCookieManager,
  rememberCookieAnswer,
  sendsGlobalPrivacyControl,
} from './cookie-consent.ts';
import styles from './first-access.module.css';

interface CookieStepProps {
  /** The publisher whose cookie manager of Google is shown; none where there are no cookies to ask about. */
  readonly adsenseClient: string | undefined;
  /** A minor's ads are never personalised, whatever they accept. */
  readonly underEighteen: boolean;
  readonly onDone: () => void;
}

/**
 * The last step of the first access: the cookie manager of Google, over a screen that says what
 * it is about. With Global Privacy Control, the ads are not personalised whatever the person
 * accepts, and the screen says why before going on.
 */
export function CookieStep({ adsenseClient, underEighteen, onDone }: CookieStepProps) {
  const { t } = useTranslation();
  const [answered, setAnswered] = useState(false);
  const gpc = sendsGlobalPrivacyControl();

  useEffect(() => {
    let active = true;
    const asked = adsenseClient ? askCookieManager(adsenseClient) : Promise.resolve(false);
    void asked.then((accepted) => {
      if (!active) return;
      rememberCookieAnswer(accepted && !gpc && !underEighteen);
      if (gpc) setAnswered(true);
      else onDone();
    });
    return () => {
      active = false;
    };
  }, [adsenseClient, gpc, underEighteen, onDone]);

  return (
    <div className={screen.screen}>
      <main className={styles.step}>
        <span className={styles.stopIcon}>
          <Icon name="cookie" size={30} />
        </span>
        <h1 className={styles.title}>{t('firstAccess.cookies.title')}</h1>
        <p className={styles.muted}>{t('firstAccess.cookies.text')}</p>
        {answered && (
          <>
            <p className={styles.note} role="status">
              {t('firstAccess.cookies.globalPrivacyControl')}
            </p>
            <div className={styles.grow} />
            <button type="button" className={styles.primary} onClick={onDone}>
              {t('firstAccess.continue')}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
