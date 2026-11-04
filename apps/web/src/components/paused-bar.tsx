import { useTranslation } from 'react-i18next';
import mascotWaiting from '../assets/brand/mascot-waiting.svg';
import styles from './notice-bar.module.css';

/** Over the screen while nobody uses the page: the link is closed, and a touch opens it again. */
export function PausedBar() {
  const { t } = useTranslation();
  return (
    <div role="status" className={`${styles.bar} ${styles.dark}`}>
      <span className={styles.mascot}>
        <img src={mascotWaiting} alt="" width={26} height={26} />
      </span>
      <span className={styles.text}>{t('notices.paused')}</span>
    </div>
  );
}
