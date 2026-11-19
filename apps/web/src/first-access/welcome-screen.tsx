import { useTranslation } from 'react-i18next';
import mascotWaving from '../assets/brand/mascot-waving.svg';
import screen from '../screens/screen.module.css';
import styles from './first-access.module.css';

interface WelcomeScreenProps {
  /** Who invites them, when the person comes from the link of a room. */
  readonly host: string | undefined;
  readonly onStart: () => void;
}

/** The first screen on a new device: the brand, a line, and the way in. */
export function WelcomeScreen({ host, onStart }: WelcomeScreenProps) {
  const { t } = useTranslation();
  return (
    <div className={screen.screen}>
      <main className={styles.welcome}>
        {host !== undefined && (
          <span className={styles.invite}>{t('firstAccess.welcome.invite', { host })}</span>
        )}
        <img className={styles.mascot} src={mascotWaving} alt="" width={160} height={160} />
        <h1 className={styles.brand}>TheLever.app</h1>
        <p className={styles.title}>{t('firstAccess.welcome.tagline')}</p>
        <p className={styles.muted}>{t('firstAccess.welcome.text')}</p>
        <div className={styles.grow} />
        <button type="button" className={styles.primary} onClick={onStart}>
          {host === undefined ? t('firstAccess.welcome.start') : t('firstAccess.welcome.join')}
        </button>
      </main>
    </div>
  );
}
