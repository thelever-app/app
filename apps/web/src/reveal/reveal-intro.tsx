import type { GameStateDto } from '@thelever-app/protocol';
import { useTranslation } from 'react-i18next';
import mascotCelebrating from '../assets/brand/mascot-celebrating.svg';
import { isAnonymous } from '../components/players.ts';
import styles from './reveal-intro.module.css';

/** How long the passage from the decision of a round to its reveal stays on screen. */
export const REVEAL_INTRO_MS = 2000;

/** «Se revela el dilema»: the brief passage from the decision of a round to its reveal. */
export function RevealIntro({
  game,
  reveal,
}: {
  readonly game: GameStateDto;
  readonly reveal: NonNullable<GameStateDto['reveal']>;
}) {
  const { t } = useTranslation();
  // Only who was asked the dilemma: not who joined the game once it was revealed.
  const asked = reveal.voteCount + reveal.didNotVoteCount;
  return (
    <div className={styles.screen} role="status">
      <div aria-hidden="true" className={styles.hazard} />
      <div className={styles.content}>
        <span className={styles.mascot}>
          <img src={mascotCelebrating} alt={t('reveal.introMascot')} width={128} height={128} />
        </span>
        <p className={styles.position}>
          {t('reveal.introPosition', {
            position: game.round.position + 1,
            total: game.dilemmas.length,
          })}
        </p>
        <h1 className={styles.title}>{t('reveal.introTitle')}</h1>
        <p className={styles.body}>
          {t('reveal.introAnswered', { count: reveal.voteCount, total: asked })}{' '}
          {isAnonymous(game) ? t('reveal.introAnonymous') : t('reveal.introNominal')}
        </p>
      </div>
      <div aria-hidden="true" className={styles.hazard} />
    </div>
  );
}
