import { useTranslation } from 'react-i18next';
// Inline, in the page itself: these screens show when the network may be gone.
import mascotDoubting from '../assets/brand/mascot-doubting.svg?inline';
import styles from './notice-bar.module.css';

/** Over the screen while the link to the room is down: the answers already sent are kept by the server. */
export function ReconnectingBar() {
  const { t } = useTranslation();
  return (
    <div role="status" className={`${styles.bar} ${styles.dark}`}>
      <span className={styles.mascot}>
        <img src={mascotDoubting} alt="" width={26} height={26} />
      </span>
      <span className={styles.text}>{t('notices.reconnecting')}</span>
    </div>
  );
}
