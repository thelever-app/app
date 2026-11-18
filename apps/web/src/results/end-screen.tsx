import type { GameStateDto } from '@thelever-app/protocol';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import mascotCelebrating from '../assets/brand/mascot-celebrating.svg';
import { Avatar } from '../avatar/avatar.tsx';
import { Icon } from '../components/icon.tsx';
import { usePlayerName } from '../components/players.ts';
import styles from './end-screen.module.css';

interface EndScreenProps {
  readonly game: GameStateDto;
  readonly onLeave: () => void;
}

/**
 * The end of the game: the place of the player in an anonymous room, who is still in the room and
 * who has left, and the way out. Nothing is played any more.
 */
export function EndScreen({ game, onLeave }: EndScreenProps) {
  const { t, i18n } = useTranslation();
  const nameOf = usePlayerName();
  const titleId = useId();
  const roomId = useId();
  const total = game.dilemmas.length;
  const mine = game.ranking?.find(({ playerId }) => playerId === game.playerId);
  const staying = game.players.filter(({ left }) => !left);
  const gone = game.players.filter(({ left }) => left).map(({ nickname }) => nickname);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <p className={styles.label}>{t('end.label', { total })}</p>
      </header>
      <main className={styles.main} tabIndex={0} aria-labelledby={titleId}>
        <div className={styles.summary}>
          <div className={styles.heading}>
            <h1 id={titleId} className={styles.title}>
              {t('end.title')}
            </h1>
            <img src={mascotCelebrating} alt={t('end.mascot')} width={88} height={88} />
          </div>
          {mine?.mentalist && (
            <span className={styles.mentalist}>
              <Icon name="psychology" size={18} />
              {t('ranking.mentalist')}
            </span>
          )}
          {mine && game.ranking && (
            <p className={styles.place}>
              {mine.mentalist
                ? t('end.placeMentalist', { players: game.ranking.length, count: mine.points })
                : t('end.place', {
                    position: mine.position,
                    players: game.ranking.length,
                    count: mine.points,
                  })}
            </p>
          )}
        </div>
        <section className={styles.room} aria-labelledby={roomId}>
          <h2 id={roomId} className={styles.roomTitle}>
            {t('end.inRoom', { count: staying.length })}
          </h2>
          <ul className={styles.avatars}>
            {staying.map((player) => (
              <li key={player.playerId} title={nameOf(player)}>
                <Avatar avatar={player.avatar} size="s" dimmed={!player.connected} />
                <span className={styles.hidden}>{nameOf(player)}</span>
              </li>
            ))}
          </ul>
          {gone.length > 0 && (
            <p className={styles.gone}>
              {t('end.gone', {
                count: gone.length,
                names: new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(gone),
              })}
            </p>
          )}
        </section>
      </main>
      <footer className={styles.footer}>
        <span className={styles.closes}>{t('end.closes')}</span>
        <button type="button" className={styles.leave} onClick={onLeave}>
          {t('end.leave')}
        </button>
      </footer>
    </div>
  );
}
