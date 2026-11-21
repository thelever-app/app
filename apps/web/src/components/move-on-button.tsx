import type { GameStateDto } from '@thelever-app/protocol';
import { useTranslation } from 'react-i18next';
import styles from './move-on-button.module.css';

interface MoveOnButtonProps {
  readonly game: GameStateDto;
  /** What the button says until the player is ready: «Siguiente dilema», «Ver resultados»… */
  readonly label: string;
  /** The player is ready to move on. */
  readonly onReady: () => void;
  /** Only for the host: moves everyone on without waiting for them to be ready. */
  readonly onMoveEveryoneOn: (() => void) | undefined;
}

/**
 * How the player moves on with the group from the reveal or a screen of the results: they say they
 * are ready, and the screen shows how many of those connected are. Once ready, the host can move
 * everyone on without waiting; the others wait for the rest.
 */
export function MoveOnButton({ game, label, onReady, onMoveEveryoneOn }: MoveOnButtonProps) {
  const { t } = useTranslation();
  const present = game.players.filter(({ connected, left }) => connected && !left);
  const ready = present.filter(({ playerId }) => game.readyToMoveOn.includes(playerId)).length;
  const youAreReady = game.readyToMoveOn.includes(game.playerId);

  return (
    <div className={styles.moveOn}>
      {ready > 0 && (
        <p role="status" className={styles.count}>
          {t('moveOn.readyCount', { ready, of: present.length })}
        </p>
      )}
      {!youAreReady ? (
        <button type="button" className={styles.button} onClick={onReady}>
          {label}
        </button>
      ) : onMoveEveryoneOn ? (
        <button type="button" className={styles.button} onClick={onMoveEveryoneOn}>
          {t('moveOn.everyone')}
        </button>
      ) : (
        <button type="button" className={styles.button} disabled>
          {t('moveOn.waiting')}
        </button>
      )}
    </div>
  );
}
