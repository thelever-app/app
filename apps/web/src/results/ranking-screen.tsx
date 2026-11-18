import type { GameStateDto } from '@thelever-app/protocol';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../avatar/avatar.tsx';
import { GroupProgressSheet } from '../components/group-progress-sheet.tsx';
import { Icon } from '../components/icon.tsx';
import { usePlayerName } from '../components/players.ts';
import { GameMenu } from '../game/game-menu.tsx';
import { Players } from '../reveal/reveal-screen.tsx';
import styles from './ranking-screen.module.css';

interface RankingScreenProps {
  readonly game: GameStateDto;
  /** Any player takes everyone from the ranking to the end of the game. */
  readonly onMoveOn: () => void;
  readonly onLeave: () => void;
  readonly onShowQr: () => void;
}

/**
 * The game results of an anonymous room: who reads the group best, by the points of their
 * distribution predictions, with El Mentalista first. Nobody sees what anybody voted.
 */
export function RankingScreen({ game, onMoveOn, onLeave, onShowQr }: RankingScreenProps) {
  const { t } = useTranslation();
  const nameOf = usePlayerName();
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const titleId = useId();
  const rows = (game.ranking ?? []).flatMap((ranked) => {
    const player = game.players.find(({ playerId }) => playerId === ranked.playerId);
    return player ? [{ ...ranked, player }] : [];
  });

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.top}>
          <p className={styles.label}>{t('ranking.label')}</p>
          <GameMenu
            code={game.code}
            onShowQr={onShowQr}
            onShowGroup={() => setIsGroupOpen(true)}
            onLeave={onLeave}
          />
        </div>
        <Players players={game.players} selfId={game.playerId} />
      </header>
      <main className={styles.main} tabIndex={0} aria-labelledby={titleId}>
        <div className={styles.intro}>
          <span className={styles.badge}>
            <Icon name="visibilityOff" size={18} />
            {t('ranking.anonymous')}
          </span>
          <h1 id={titleId} className={styles.title}>
            {t('ranking.title')}
          </h1>
          <p className={styles.text}>{t('ranking.text')}</p>
        </div>
        <ol className={styles.ranking} aria-labelledby={titleId}>
          {rows.map(({ playerId, points, position, mentalist, player }) => (
            <li
              key={playerId}
              className={styles.row}
              data-self={playerId === game.playerId ? '' : undefined}
            >
              <span className={styles.position}>{t('ranking.position', { position })}</span>
              <Avatar avatar={player.avatar} size="s" />
              <span className={styles.name}>{nameOf(player)}</span>
              {mentalist && (
                <span className={styles.mentalist} role="img" aria-label={t('ranking.mentalist')}>
                  <Icon name="psychology" size={18} />
                </span>
              )}
              <span className={styles.points}>{t('ranking.points', { points })}</span>
            </li>
          ))}
        </ol>
        <p className={styles.note}>{t('ranking.note')}</p>
      </main>
      <footer className={styles.footer}>
        <button type="button" className={styles.next} onClick={onMoveOn}>
          {t('ranking.next')}
        </button>
      </footer>
      <GroupProgressSheet game={game} open={isGroupOpen} onOpenChange={setIsGroupOpen} />
    </div>
  );
}
