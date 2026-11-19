import { useTranslation } from 'react-i18next';
import mascotCelebrating from '../assets/brand/mascot-celebrating.svg';
import styles from '../reveal/reveal-intro.module.css';

/** How long the passage from the last round to the game results stays on screen. */
export const RESULTS_INTRO_MS = 2000;

/** «Resultados»: the brief passage from the reveal of the last round to the results. */
export function ResultsIntro() {
  const { t } = useTranslation();
  return (
    <div className={styles.screen} role="status">
      <div aria-hidden="true" className={styles.hazard} />
      <div className={styles.content}>
        <span className={styles.mascot}>
          <img src={mascotCelebrating} alt={t('reveal.introMascot')} width={128} height={128} />
        </span>
        <h1 className={styles.title}>{t('results.introTitle')}</h1>
      </div>
      <div aria-hidden="true" className={styles.hazard} />
    </div>
  );
}
