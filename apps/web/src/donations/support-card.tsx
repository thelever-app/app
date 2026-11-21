import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { useDonationUrl } from '../config/donation-url.tsx';
import { useUnderEighteen } from '../first-access/device-age.tsx';
import { closeSupportCard, supportCardClosed } from './support-card-state.ts';
import styles from './donations.module.css';

/**
 * The card of the home that invites an adult to support TheLever with a donation, on its page
 * outside the app; once closed, it does not come back on the device. Nothing for under 18s.
 */
export function SupportCard() {
  const { t } = useTranslation();
  const donationUrl = useDonationUrl();
  const underEighteen = useUnderEighteen();
  const [closed, setClosed] = useState(supportCardClosed);
  if (underEighteen || closed) return null;
  const link = t('donations.card.link');
  return (
    <aside className={styles.card} aria-label={link}>
      <Icon name="favorite" />
      <div className={styles.text}>
        <strong>{t('donations.card.title')}</strong>
        <span>{t('donations.card.text')}</span>
        <a
          className={styles.support}
          href={donationUrl}
          target="_blank"
          rel="noopener"
          aria-label={t('appSettings.outside', { name: link })}
        >
          {link}
          <Icon name="openInNew" size={18} />
        </a>
      </div>
      <button
        type="button"
        className={styles.close}
        aria-label={t('donations.card.close')}
        onClick={() => {
          closeSupportCard();
          setClosed(true);
        }}
      >
        <Icon name="close" size={20} />
      </button>
    </aside>
  );
}
