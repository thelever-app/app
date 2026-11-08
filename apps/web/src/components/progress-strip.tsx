import type { GameStateDto } from '@thelever-app/protocol';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../avatar/avatar.tsx';
import { GameTimer } from '../game/game-timer.tsx';
import { GroupProgressSheet } from './group-progress-sheet.tsx';
import { hasFinished, usePlayerName, useSelfPlayerId } from './players.ts';
import { StationLine } from './station-line.tsx';
import styles from './progress-strip.module.css';

/** How many players fit in the strip at 360 px; the rest are shown as +N. */
const VISIBLE_PLAYERS = 4;

interface ProgressStripProps {
  /** The index of the dilemma on screen, from 0. */
  readonly position: number;
  readonly players: GameStateDto['players'];
  readonly dilemmaCount: number;
  /** The total time, to show what is left. */
  readonly game: Pick<GameStateDto, 'totalTimeEndsAt' | 'serverTime'>;
  /** «Más opciones», at the end of the first row. */
  readonly menu?: ReactNode;
  /** On the predictions of a nominal room, the strip says so and leaves out the group. */
  readonly step?: 'vote' | 'predict';
}

export function ProgressStrip({
  position,
  players,
  dilemmaCount,
  game,
  menu,
  step = 'vote',
}: ProgressStripProps) {
  const { t } = useTranslation();
  const selfPlayerId = useSelfPlayerId();
  const nameOf = usePlayerName();
  const ordered = [
    ...players.filter(({ playerId }) => playerId === selfPlayerId),
    ...players.filter(({ playerId }) => playerId !== selfPlayerId),
  ];
  const visible = ordered.slice(0, VISIBLE_PLAYERS);
  const hidden = ordered.length - visible.length;

  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <p className={styles.position}>
          {t(step === 'vote' ? 'progressStrip.position' : 'progressStrip.predicting', {
            position: position + 1,
            total: dilemmaCount,
          })}
        </p>
        <GameTimer game={game} />
        {menu}
      </div>
      <StationLine stations={dilemmaCount} passed={position} />
      {step === 'vote' && (
        <section className={styles.group} aria-label={t('progressStrip.group')}>
          <ul className={styles.players}>
            {visible.map((player) => (
              <li key={player.playerId} className={styles.player} title={nameOf(player)}>
                <Avatar avatar={player.avatar} size="s" dimmed={!player.connected} />
                <span className={styles.name}>{nameOf(player)}</span>{' '}
                <span className={styles.count} data-finished={hasFinished(player, dilemmaCount)}>
                  {t('playerList.progressCount', {
                    progress: player.progress,
                    total: dilemmaCount,
                  })}
                </span>
              </li>
            ))}
          </ul>
          {hidden > 0 && (
            <span className={styles.more}>{t('progressStrip.more', { count: hidden })}</span>
          )}
          <span className={styles.showAll}>
            <GroupProgressSheet players={players} dilemmaCount={dilemmaCount} />
          </span>
        </section>
      )}
    </header>
  );
}
