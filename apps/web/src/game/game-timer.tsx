import type { GameStateDto } from '@thelever-app/protocol';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { LAST_SECONDS } from '../sound/moments.ts';
import { formatRemaining, useRemainingSeconds } from './remaining-time.ts';
import styles from './game-timer.module.css';

interface GameTimerProps {
  readonly game: Pick<GameStateDto, 'round' | 'serverTime'>;
}

/**
 * The time left for the dilemma of the round, in m:ss with tabular numbers so it does not jump; it
 * beats in the last seconds.
 */
export function GameTimer({ game }: GameTimerProps) {
  const { t } = useTranslation();
  const seconds = useRemainingSeconds(game.round.endsAt, game.serverTime);
  const shown = formatRemaining(seconds);
  const lastSeconds = seconds > 0 && seconds <= LAST_SECONDS;
  return (
    <p
      role="timer"
      className={styles.timer}
      aria-label={t('game.timeLeft', { time: shown })}
      data-last-seconds={lastSeconds || undefined}
    >
      <Icon name="timer" size={18} />
      <span aria-hidden="true">{shown}</span>
    </p>
  );
}
