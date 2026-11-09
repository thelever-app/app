import type { GameStateDto } from '@thelever-app/protocol';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../avatar/avatar.tsx';
import { GameTimer } from '../game/game-timer.tsx';
import { GroupProgressSheet } from './group-progress-sheet.tsx';
import { Icon } from './icon.tsx';
import {
  hasAnswered,
  isAnonymous,
  pendingCountOf,
  usePlayerName,
  useSelfPlayerId,
} from './players.ts';
import { StationLine } from './station-line.tsx';
import styles from './progress-strip.module.css';

/** How many players fit in the strip at 360 px; the rest are shown as +N. */
const VISIBLE_PLAYERS = 4;

/** How long the strip says who moved everyone on to the round. */
export const MOVED_ON_NOTICE_MS = 3000;

interface ProgressStripProps {
  readonly game: GameStateDto;
  /** What the first row says: the dilemma of the round and, past its vote, where the player is. */
  readonly label: string;
  /** «Más opciones», at the end of the first row. */
  readonly menu?: ReactNode;
  /** On the predictions of a nominal room, the strip leaves out the group. */
  readonly showGroup?: boolean;
}

/**
 * The top of the decision of a round: which dilemma it is, its time, the line of the game and who
 * answered it (in an anonymous room, only how many). For a few seconds it also says who moved
 * everyone on to the round, in the place of «Ver todos», so it covers nothing of the dilemma.
 */
export function ProgressStrip({ game, label, menu, showGroup = true }: ProgressStripProps) {
  const { position, movedOnBy } = game.round;
  const [seenPosition, setSeenPosition] = useState(position);
  const [mover, setMover] = useState(movedOnBy);
  if (position !== seenPosition) {
    setSeenPosition(position);
    setMover(movedOnBy);
  }
  useEffect(() => {
    if (mover === null) return;
    const hide = setTimeout(() => setMover(null), MOVED_ON_NOTICE_MS);
    return () => clearTimeout(hide);
  }, [mover, seenPosition]);

  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <p className={styles.position}>{label}</p>
        <GameTimer game={game} />
        {menu}
      </div>
      <StationLine stations={game.dilemmas.length} passed={position} />
      {showGroup && <Group game={game} mover={mover} />}
    </header>
  );
}

function Group({ game, mover }: { readonly game: GameStateDto; readonly mover: string | null }) {
  const { t } = useTranslation();
  const nameOf = usePlayerName();
  const moverPlayer = game.players.find(({ playerId }) => playerId === mover);
  const action = moverPlayer ? (
    <span role="status" className={styles.movedOn}>
      <Icon name="arrowForward" size={16} />
      {t('progressStrip.movedOn', { name: nameOf(moverPlayer) })}
    </span>
  ) : (
    <span className={styles.showAll}>
      <GroupProgressSheet game={game} />
    </span>
  );

  if (isAnonymous(game)) {
    return (
      <section className={styles.group} aria-label={t('progressStrip.anonymousGroup')}>
        <Icon name="howToVote" size={20} />
        <span className={styles.answeredCount}>
          {t('progressStrip.anonymousCount', {
            count: game.answeredCount,
            pending: pendingCountOf(game),
          })}
        </span>
        {action}
      </section>
    );
  }
  return (
    <section className={styles.group} aria-label={t('progressStrip.group')}>
      <WhoAnswered game={game} mover={mover} />
      {action}
    </section>
  );
}

function WhoAnswered({
  game,
  mover,
}: {
  readonly game: GameStateDto;
  readonly mover: string | null;
}) {
  const { t } = useTranslation();
  const selfPlayerId = useSelfPlayerId();
  const nameOf = usePlayerName();
  const inGame = game.players.filter(({ left }) => !left);
  const ordered = [
    ...inGame.filter(({ playerId }) => playerId === selfPlayerId),
    ...inGame.filter(({ playerId }) => playerId !== selfPlayerId),
  ];
  const visible = ordered.slice(0, VISIBLE_PLAYERS);
  const hidden = ordered.length - visible.length;

  return (
    <>
      <ul className={styles.players}>
        {visible.map((player) => {
          const name = player.connected
            ? nameOf(player)
            : t('progressStrip.playerDisconnected', { name: nameOf(player) });
          const label = hasAnswered(player)
            ? t('progressStrip.playerAnswered', { name })
            : t('progressStrip.playerPending', { name });
          return (
            <li
              key={player.playerId}
              className={styles.player}
              title={label}
              data-mover={player.playerId === mover || undefined}
            >
              <Avatar avatar={player.avatar} size="s" dimmed={!player.connected} />
              {hasAnswered(player) && (
                <span aria-hidden="true" className={styles.check}>
                  <Icon name="check" size={14} />
                </span>
              )}
              <span className={styles.name}>{label}</span>
            </li>
          );
        })}
      </ul>
      {hidden > 0 && (
        <span className={styles.more}>{t('progressStrip.more', { count: hidden })}</span>
      )}
    </>
  );
}
