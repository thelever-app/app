import { useTranslation } from 'react-i18next';
import mascotWaiting from '../assets/brand/mascot-waiting.svg';
import styles from './notice-bar.module.css';

/** Over the screen while the link to the room is down: the answers already sent are kept by the server. */
export function ReconnectingBar() {
  const { t } = useTranslation();
  return (
    <div role="status" className={`${styles.bar} ${styles.dark}`}>
      <span className={styles.mascot}>
        <img src={mascotWaiting} alt="" width={26} height={26} />
      </span>
      <span className={styles.text}>{t('notices.reconnecting')}</span>
    </div>
  );
}
