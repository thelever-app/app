import type { GameStateDto } from '@thelever-app/protocol';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../avatar/avatar.tsx';
import { Icon } from './icon.tsx';
import { hasAnswered, pendingCountOf, usePlayerName } from './players.ts';
import styles from './player-list.module.css';

type Player = GameStateDto['players'][number];

interface PlayerListProps {
  readonly game: Pick<GameStateDto, 'players' | 'answeredCount'>;
  /** In an anonymous room nobody sees who answered, only how many. */
  readonly anonymous: boolean;
}

/** Who answered the dilemma of the round and who is still to; never what anybody answered. */
export function PlayerList({ game, anonymous }: PlayerListProps) {
  return anonymous ? <AnsweredCount game={game} /> : <WhoAnswered players={game.players} />;
}

function WhoAnswered({ players }: { readonly players: readonly Player[] }) {
  const { t } = useTranslation();
  const pendingId = useId();
  const doneId = useId();
  const nameOf = usePlayerName();
  const pending = players.filter((player) => !player.left && !hasAnswered(player));
  const done = players.filter(hasAnswered);

  return (
    <div className={styles.list}>
      {pending.length > 0 && (
        <section className={styles.section} aria-labelledby={pendingId}>
          <h2 id={pendingId} className={styles.heading}>
            {t('playerList.pending', { count: pending.length })}
          </h2>
          <ul className={styles.players}>
            {pending.map((player) => (
              <PlayerRow key={player.playerId} player={player} name={nameOf(player)} />
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
              <Avatar avatar={player.avatar} size="xs" dimmed={!player.connected} />
              {nameOf(player)}
              {!player.connected && (
                <span className={styles.disconnected}>
                  {' · '}
                  {t('playerList.disconnected')}
                </span>
              )}
              <span role="img" aria-label={t('playerList.answered')} className={styles.answered}>
                <Icon name="checkCircle" size={18} />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function AnsweredCount({
  game,
}: {
  readonly game: Pick<GameStateDto, 'players' | 'answeredCount'>;
}) {
  const { t } = useTranslation();
  const roomId = useId();
  const nameOf = usePlayerName();
  const inRoom = game.players.filter(({ left }) => !left);
  const pending = pendingCountOf(game);

  return (
    <div className={styles.list}>
      <section className={styles.count}>
        <p className={styles.countLine}>
          <span className={styles.countNumber}>{game.answeredCount}</span>{' '}
          {t('playerList.anonymousAnswered', { count: game.answeredCount })}
          {' · '}
          {t('playerList.anonymousPending', { count: pending })}
        </p>
        <p className={styles.note}>{t('playerList.anonymousNote')}</p>
      </section>
      <section className={styles.section} aria-labelledby={roomId}>
        <h2 id={roomId} className={styles.heading}>
          {t('playerList.inRoom', { count: inRoom.length })}
        </h2>
        <ul className={styles.players}>
          {inRoom.map((player) => (
            <PlayerRow key={player.playerId} player={player} name={nameOf(player)} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function PlayerRow({ player, name }: { readonly player: Player; readonly name: string }) {
  const { t } = useTranslation();
  return (
    <li className={styles.player}>
      <Avatar avatar={player.avatar} size="s" dimmed={!player.connected} />
      <span className={styles.name}>
        {name}
        {!player.connected && (
          <span className={styles.disconnected}>
            {' · '}
            {t('playerList.disconnected')}
          </span>
        )}
      </span>
    </li>
  );
}
