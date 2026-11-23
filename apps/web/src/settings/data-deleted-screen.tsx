import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { HOME_PATH } from '../home-path.ts';
import screen from '../screens/screen.module.css';
import styles from './settings.module.css';

/**
 * The deletion is asked for: the device already keeps nothing of the player. Going back opens the
 * app again from the start, as on a new device.
 */
export function DataDeletedScreen() {
  const { t } = useTranslation();
  return (
    <div className={screen.screen}>
      <main className={styles.done}>
        <span className={styles.doneIcon}>
          <Icon name="check" size={34} />
        </span>
        <h1 className={styles.heading}>{t('dataDeleted.title')}</h1>
        <p className={styles.cardText}>{t('dataDeleted.text')}</p>
        <button
          type="button"
          className={styles.primary}
          onClick={() => window.location.assign(HOME_PATH)}
        >
          {t('dataDeleted.home')}
        </button>
      </main>
    </div>
  );
}
