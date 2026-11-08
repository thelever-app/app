import type { GameStateDto } from '@thelever-app/protocol';
import { useTranslation } from 'react-i18next';
import mascotDeciding from '../assets/brand/mascot-deciding.svg';
import mascotWaiting from '../assets/brand/mascot-waiting.svg';
import { Icon } from '../components/icon.tsx';
import { PlayerList } from '../components/player-list.tsx';
import { StationLine } from '../components/station-line.tsx';
import { GameTimer } from '../game/game-timer.tsx';
import screen from './screen.module.css';
import styles from './waiting-screen.module.css';

interface WaitingScreenProps {
  readonly game: GameStateDto;
  readonly onReview: () => void;
  readonly onLaunchReveal: () => void;
}

/** «Esperando a los demás»: the player has answered every dilemma; the host may start the reveal. */
export function WaitingScreen({ game, onReview, onLaunchReveal }: WaitingScreenProps) {
  const { t } = useTranslation();
  const total = game.dilemmas.length;
  const isHost = game.hostId === game.playerId;
  const host = game.players.find(({ playerId }) => playerId === game.hostId)?.nickname ?? '';
  const missing = game.players.filter(({ progress, left }) => !left && progress < total).length;
  const timeUp = game.totalTimeRanOut;

  return (
    <div className={screen.screen}>
      <header className={styles.header}>
        <div className={styles.top}>
          <p className={styles.position}>{t('waiting.finished', { progress: total, total })}</p>
          <GameTimer game={game} />
        </div>
        <StationLine stations={total} passed={total} />
      </header>
      <main className={styles.main}>
        {timeUp && <div aria-hidden="true" className={styles.hazard} />}
        <div className={styles.intro}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{timeUp ? t('timeUp.title') : t('waiting.title')}</h1>
            <span className={styles.mascot}>
              <img
                src={timeUp ? mascotDeciding : mascotWaiting}
                alt={timeUp ? t('waiting.mascotDoubting') : t('waiting.mascotWaiting')}
                width={72}
                height={72}
              />
            </span>
          </div>
          <p className={styles.subtitle}>
            {!timeUp && t('waiting.subtitle')}
            {timeUp && (isHost ? t('timeUp.subtitleHost') : t('timeUp.subtitleGuest', { host }))}
          </p>
          <button type="button" className={styles.review} onClick={onReview}>
            <Icon name="undo" size={18} />
            {t('waiting.review')}
          </button>
        </div>
        <PlayerList players={game.players} dilemmaCount={total} />
      </main>
      <footer className={styles.footer}>
        {isHost ? (
          <>
            <button type="button" className={styles.launch} onClick={onLaunchReveal}>
              {t('waiting.launchReveal')}
            </button>
            <p className={styles.caption}>{t('waiting.launchCaption', { count: missing })}</p>
          </>
        ) : (
          <p className={styles.guest}>
            {timeUp ? t('waiting.guestTimeUp') : t('waiting.guest', { host })}
          </p>
        )}
      </footer>
    </div>
  );
}
