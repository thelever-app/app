import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../components/icon.tsx';
import { useDonationUrl } from '../config/donation-url.tsx';
import styles from './first-access.module.css';

const WAYS: readonly (readonly ['ads' | 'research', IconName])[] = [
  ['ads', 'ad'],
  ['research', 'science'],
];

/**
 * How TheLever is funded, as the game consent and the settings show it: the ads, research perhaps
 * one day and the donations, which the donation page takes outside the app.
 */
export function FundingPoints() {
  const { t } = useTranslation();
  const donationUrl = useDonationUrl();
  return (
    <>
      <p className={styles.title}>{t('firstAccess.funding.lead')}</p>
      <ul className={styles.points}>
        {WAYS.map(([way, icon]) => (
          <li key={way} className={styles.point}>
            <span className={styles.pointIcon}>
              <Icon name={icon} size={20} />
            </span>
            <p className={styles.pointText}>
              <strong>{t(`firstAccess.funding.${way}.title`)}</strong>{' '}
              {t(`firstAccess.funding.${way}.text`)}
            </p>
          </li>
        ))}
        <li className={styles.point}>
          <span className={styles.pointIcon}>
            <Icon name="favorite" size={20} />
          </span>
          <div className={styles.pointBody}>
            <p className={styles.pointText}>
              <strong>{t('firstAccess.funding.donations.title')}</strong>{' '}
              {t('firstAccess.funding.donations.text')}
            </p>
            <a
              className={styles.donate}
              href={donationUrl}
              target="_blank"
              rel="noopener"
              aria-label={t('firstAccess.funding.donations.label')}
            >
              {t('firstAccess.funding.donations.link')}
              <Icon name="openInNew" size={20} />
            </a>
          </div>
        </li>
      </ul>
    </>
  );
}
