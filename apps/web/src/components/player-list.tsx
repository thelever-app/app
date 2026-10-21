import type { GameStateDto } from '@thelever-app/protocol';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './icon.tsx';
import { hasFinished, usePlayerName } from './players.ts';
import styles from './player-list.module.css';

type Player = GameStateDto['players'][number];

interface PlayerListProps {
  readonly players: readonly Player[];
  readonly dilemmaCount: number;
  readonly selfPlayerId: string;
}

export function PlayerList({ players, dilemmaCount, selfPlayerId }: PlayerListProps) {
  const { t } = useTranslation();
  const pendingId = useId();
  const doneId = useId();

  const nameOf = usePlayerName(selfPlayerId);
  const pending = players
    .filter((player) => !hasFinished(player, dilemmaCount))
    .toSorted((a, b) => a.progress - b.progress);
  const done = players.filter((player) => hasFinished(player, dilemmaCount));

  return (
    <div className={styles.list}>
      {pending.length > 0 && (
        <section className={styles.section} aria-labelledby={pendingId}>
          <h2 id={pendingId} className={styles.heading}>
            {t('playerList.pending', { count: pending.length })}
          </h2>
          <ul className={styles.pending}>
            {pending.map((player) => (
              <li key={player.playerId} className={styles.pendingPlayer}>
                <div className={styles.pendingLine}>
                  <span className={styles.name}>{nameOf(player)}</span>
                  <span className={styles.count}>
                    {t('playerList.progressCount', {
                      progress: player.progress,
                      total: dilemmaCount,
                    })}
                  </span>
                </div>
                <progress
                  className={styles.bar}
                  max={dilemmaCount}
                  value={player.progress}
                  aria-label={t('playerList.progressOf', { name: nameOf(player) })}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className={styles.section} aria-labelledby={doneId}>
        <h2 id={doneId} className={styles.heading}>
          {t('playerList.done', { count: done.length })}
        </h2>
        <ul className={styles.done}>
          {done.map((player) => (
            <li key={player.playerId} className={styles.donePlayer}>
              {nameOf(player)}
              <span role="img" aria-label={t('playerList.finished')} className={styles.finished}>
                <Icon name="checkCircle" size={18} />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
