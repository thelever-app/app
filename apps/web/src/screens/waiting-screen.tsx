import type { GameStateDto } from '@thelever-app/protocol';
import { useTranslation } from 'react-i18next';
import mascotWaiting from '../assets/brand/mascot-waiting.svg';
import { Icon } from '../components/icon.tsx';
import { PlayerList } from '../components/player-list.tsx';
import { isAnonymous, pendingCountOf } from '../components/players.ts';
import { StationLine } from '../components/station-line.tsx';
import { GameTimer } from '../game/game-timer.tsx';
import screen from './screen.module.css';
import styles from './waiting-screen.module.css';

interface WaitingScreenProps {
  readonly game: GameStateDto;
  /** Back to the dilemma of the round, to change the answer while it is not revealed; none after skipping it. */
  readonly onChange: (() => void) | undefined;
  readonly onRevealEarly: () => void;
}

/** «Esperando a los demás»: the player answered the dilemma of the round; the host may reveal it now. */
export function WaitingScreen({ game, onChange, onRevealEarly }: WaitingScreenProps) {
  const { t } = useTranslation();
  const total = game.dilemmas.length;
  const { position } = game.round;
  const isHost = game.hostId === game.playerId;
  const host = game.players.find(({ playerId }) => playerId === game.hostId)?.nickname ?? '';

  return (
    <div className={screen.screen}>
      <header className={styles.header}>
        <div className={styles.top}>
          <p className={styles.position}>
            {t('waiting.position', { position: position + 1, total })}
          </p>
          <GameTimer game={game} />
        </div>
        <StationLine stations={total} passed={position} />
      </header>
      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{t('waiting.title')}</h1>
            <span className={styles.mascot}>
              <img src={mascotWaiting} alt={t('waiting.mascotWaiting')} width={72} height={72} />
            </span>
          </div>
          <p className={styles.subtitle}>{t('waiting.subtitle')}</p>
          {onChange && (
            <button type="button" className={styles.review} onClick={onChange}>
              <Icon name="edit" size={18} />
              {t('waiting.change')}
            </button>
          )}
        </div>
        <PlayerList game={game} anonymous={isAnonymous(game)} />
      </main>
      <footer className={styles.footer}>
        {isHost ? (
          <>
            <button type="button" className={styles.launch} onClick={onRevealEarly}>
              {t('waiting.revealEarly')}
            </button>
            <p className={styles.caption}>
              {t('waiting.revealCaption', { count: pendingCountOf(game) })}
            </p>
          </>
        ) : (
          <p className={styles.guest}>{t('waiting.guest', { host })}</p>
        )}
      </footer>
    </div>
  );
}
