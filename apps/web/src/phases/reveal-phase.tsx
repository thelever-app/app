import { useTranslation } from 'react-i18next';
import styles from '../screens/screen.module.css';

/** The reveal, once the decision phase ends: its screens come with the reveal itself. */
export function RevealPhase() {
  const { t } = useTranslation();
  return (
    <div className={styles.screen}>
      <main aria-label={t('reveal.region')} />
    </div>
  );
}
