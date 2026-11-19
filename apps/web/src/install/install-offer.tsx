import { useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { closeOffer, mayOffer } from './install-offer-state.ts';
import { installPrompt } from './install-prompt.ts';
import styles from './install-offer.module.css';

/** Whether the app already runs from the home screen of the device. */
function isInstalled(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

/** Safari on iOS makes no offer: it only installs from its Share menu. */
function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

/**
 * A discreet offer to install the app on the home screen: with the offer of the browser
 * where it makes one, and with how to do it on iOS. Once closed, it comes back only after 30 days
 * and a finished game.
 */
export function InstallOffer() {
  const { t } = useTranslation();
  const offered = useSyncExternalStore(installPrompt.subscribe, installPrompt.current);
  const [closed, setClosed] = useState(() => !mayOffer(Date.now()));
  const ios = isIos();
  if (closed || isInstalled() || (!offered && !ios)) return null;
  return (
    <aside className={styles.offer} aria-label={t('installOffer.title')}>
      <Icon name="mobileArrowDown" />
      <div className={styles.text}>
        <strong>{t('installOffer.title')}</strong>
        <span>{offered ? t('installOffer.android') : t('installOffer.ios')}</span>
        {offered && (
          <button
            type="button"
            className={styles.install}
            onClick={() => {
              installPrompt.use();
              void offered.prompt();
            }}
          >
            {t('installOffer.install')}
          </button>
        )}
      </div>
      <button
        type="button"
        className={styles.close}
        aria-label={t('installOffer.close')}
        onClick={() => {
          closeOffer(Date.now());
          setClosed(true);
        }}
      >
        <Icon name="close" size={20} />
      </button>
    </aside>
  );
}
