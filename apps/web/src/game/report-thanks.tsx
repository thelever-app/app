import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { GameToast } from './game-toast.tsx';
import styles from './report-thanks.module.css';

/** How long the thanks stays where nothing else takes its place, such as the lobby or the reveal. */
export const THANKS_MS = 4000;

/** «Gracias, lo revisaremos.», for a moment, once a report is sent. */
export function ReportThanks({ onDone }: { readonly onDone: () => void }) {
  const { t } = useTranslation();
  useEffect(() => {
    const done = setTimeout(onDone, THANKS_MS);
    return () => clearTimeout(done);
  }, [onDone]);

  return (
    <GameToast>
      <p className={styles.thanks}>
        <span className={styles.icon}>
          <Icon name="checkCircle" size={20} />
        </span>
        <strong className={styles.signal}>{t('reportSent.thanks')}</strong>
      </p>
    </GameToast>
  );
}
