import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import screen from '../screens/screen.module.css';
import { IpGeolocationCredit } from './ip-geolocation-credit.tsx';
import styles from './first-access.module.css';

interface StopScreenProps {
  /** Under the minimum age of the region, for good on this device; or in a blocked country. */
  readonly reason: 'under-minimum-age' | 'blocked-country';
}

/** Where the first access stops: nothing of the app is reachable from here, on purpose. */
export function StopScreen({ reason }: StopScreenProps) {
  const { t } = useTranslation();
  const key = reason === 'blocked-country' ? 'firstAccess.country' : 'firstAccess.underage';
  return (
    <div className={screen.screen}>
      <main className={styles.stop} role="alert">
        <span className={styles.stopIcon}>
          <Icon name={reason === 'blocked-country' ? 'publicOff' : 'lock'} size={30} />
        </span>
        <h1 className={styles.title}>{t(`${key}.title`)}</h1>
        <p className={styles.muted}>{t(`${key}.text`)}</p>
        {reason === 'blocked-country' && (
          <a className={styles.link} href={`mailto:privacidad@thelever.app`}>
            {t('firstAccess.country.contact')}
          </a>
        )}
        {/* Both stops come from the region of the device: its country, or its minimum age. */}
        <IpGeolocationCredit className={styles.attribution} />
      </main>
    </div>
  );
}
