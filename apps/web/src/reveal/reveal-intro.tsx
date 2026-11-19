import { useTranslation } from 'react-i18next';
import mascotCelebrating from '../assets/brand/mascot-celebrating.svg';
import styles from './reveal-intro.module.css';

/** How long the passage from the decision of a round to its reveal stays on screen. */
export const REVEAL_INTRO_MS = 2000;

/** «Se revela el dilema»: the brief passage from the decision of a round to its reveal. */
export function RevealIntro() {
  const { t } = useTranslation();
  return (
    <div className={styles.screen} role="status">
      <div aria-hidden="true" className={styles.hazard} />
      <div className={styles.content}>
        <span className={styles.mascot}>
          <img src={mascotCelebrating} alt={t('reveal.introMascot')} width={128} height={128} />
        </span>
        <h1 className={styles.title}>{t('reveal.introTitle')}</h1>
      </div>
      <div aria-hidden="true" className={styles.hazard} />
    </div>
  );
}
