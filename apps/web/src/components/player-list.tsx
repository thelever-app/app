import type { GameStateDto } from '@thelever-app/protocol';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

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

  const nameOf = (player: Player) => {
    if (player.playerId === selfPlayerId) return t('playerList.you');
    return player.nickname;
  };
  const pending = players
    .filter(({ progress }) => progress < dilemmaCount)
    .toSorted((a, b) => a.progress - b.progress);
  const done = players.filter(({ progress }) => progress >= dilemmaCount);

  return (
    <div>
      {pending.length > 0 && (
        <section aria-labelledby={pendingId}>
          <h2 id={pendingId}>{t('playerList.pending', { count: pending.length })}</h2>

          <ul>
            {pending.map((player) => (
              <li key={player.playerId}>
                <span>{nameOf(player)}</span>
                <span>
                  {t('playerList.progressCount', {
                    progress: player.progress,
                    total: dilemmaCount,
                  })}
                </span>
                <progress
                  max={dilemmaCount}
                  value={player.progress}
                  aria-label={t('playerList.progressOf', { name: nameOf(player) })}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby={doneId}>
        <h2 id={doneId}>{t('playerList.done', { count: done.length })}</h2>
        <ul>
          {done.map((player) => (
            <li key={player.playerId}>
              {nameOf(player)} <span aria-label={t('playerList.finished')}>✓</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
