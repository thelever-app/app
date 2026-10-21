import type { GameStateDto } from '@thelever-app/protocol';
import { useTranslation } from 'react-i18next';
import { GroupProgressSheet } from './group-progress-sheet.tsx';
import { hasFinished, usePlayerName } from './players.ts';
import { StationLine } from './station-line.tsx';
import styles from './progress-strip.module.css';

/** How many players fit in the strip at 360 px; the rest are shown as +N. */
const VISIBLE_PLAYERS = 4;

interface ProgressStripProps {
  /** The index of the dilemma on screen, from 0. */
  readonly position: number;
  readonly players: GameStateDto['players'];
  readonly dilemmaCount: number;
  readonly selfPlayerId: string;
}

export function ProgressStrip({
  position,
  players,
  dilemmaCount,
  selfPlayerId,
}: ProgressStripProps) {
  const { t } = useTranslation();
  const nameOf = usePlayerName(selfPlayerId);
  const ordered = [
    ...players.filter(({ playerId }) => playerId === selfPlayerId),
    ...players.filter(({ playerId }) => playerId !== selfPlayerId),
  ];
  const visible = ordered.slice(0, VISIBLE_PLAYERS);
  const hidden = ordered.length - visible.length;

  return (
    <header className={styles.header}>
      <p className={styles.position}>
        {t('progressStrip.position', { position: position + 1, total: dilemmaCount })}
      </p>
      <StationLine stations={dilemmaCount} passed={position} />
      <section className={styles.group} aria-label={t('progressStrip.group')}>
        <ul className={styles.players}>
          {visible.map((player) => (
            <li key={player.playerId} className={styles.player}>
              <span className={styles.name}>{nameOf(player)}</span>{' '}
              <span className={styles.count} data-finished={hasFinished(player, dilemmaCount)}>
                {t('playerList.progressCount', { progress: player.progress, total: dilemmaCount })}
              </span>
            </li>
          ))}
        </ul>
        {hidden > 0 && (
          <span className={styles.more}>{t('progressStrip.more', { count: hidden })}</span>
        )}
        <span className={styles.showAll}>
          <GroupProgressSheet
            players={players}
            dilemmaCount={dilemmaCount}
            selfPlayerId={selfPlayerId}
          />
        </span>
      </section>
    </header>
  );
}
