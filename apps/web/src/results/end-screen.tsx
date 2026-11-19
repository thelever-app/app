import type { GameStateDto } from '@thelever-app/protocol';
import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import mascotCelebrating from '../assets/brand/mascot-celebrating.svg';
import { Avatar } from '../avatar/avatar.tsx';
import { Icon } from '../components/icon.tsx';
import { isAnonymous, usePlayerName } from '../components/players.ts';
import { playedIn, rememberPlayed } from '../game/played-dilemmas.ts';
import { groupCardOf, personalCardOf, type CardContent } from './card-content.ts';
import { RankingList } from './ranking-screen.tsx';
import { ShareCardSheet } from './share-card-sheet.tsx';
import cardStyles from './share-card-sheet.module.css';
import { TITLE_ICONS, soulmatesOf, titlesOf } from './titles.ts';
import { TitlesSummary } from './titles-summary.tsx';
import styles from './end-screen.module.css';

interface EndScreenProps {
  readonly game: GameStateDto;
  readonly onLeave: () => void;
  /** The host takes who is still in the room to the lobby of a new game. */
  readonly onRematch: () => void;
}

/**
 * The end of the game: the place of the player, who is still in the room and who has left, the
 * card to share, the rematch for the host and the way out. Nothing is played any more, and the
 * device keeps the dilemmas the player played, so the next rooms put first what nobody played.
 */
export function EndScreen({ game, onLeave, onRematch }: EndScreenProps) {
  const { t, i18n } = useTranslation();
  const nameOf = usePlayerName();
  const titleId = useId();
  const roomId = useId();
  const rankingId = useId();
  const titlesId = useId();
  const [sharing, setSharing] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const anonymous = isAnonymous(game);
  const list = (names: readonly string[]) =>
    new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(names);
  const mine = game.ranking?.find(({ playerId }) => playerId === game.playerId);
  const staying = game.players.filter(({ left }) => !left);
  const gone = game.players.filter(({ left }) => left).map(({ nickname }) => nickname);
  const host = game.players.find(({ playerId }) => playerId === game.hostId);
  const isHost = game.hostId === game.playerId;
  const myTitles = titlesOf(game.results, game.playerId);
  const knowers = (game.results?.knownBestBy?.playerIds ?? []).flatMap((playerId) =>
    game.players.filter((player) => player.playerId === playerId),
  );

  // Once per game: a new state of the same game, as someone leaves, keeps the same dilemmas. Who
  // came once it had ended played none of them.
  const { gameId, inGame } = game;
  const played = inGame ? playedIn(game).join() : '';
  useEffect(() => {
    if (played !== '') rememberPlayed(played.split(','));
  }, [gameId, played]);

  // Each state of the game is a new object, also when nothing on the card changes, as someone
  // connects: the card stays the same object until what it says changes, so it is drawn only then.
  const said = JSON.stringify(
    anonymous ? groupCardOf(game, t) : personalCardOf(game, t, showNames),
  );
  const card = useMemo(() => JSON.parse(said) as CardContent, [said]);
  const others = [
    ...knowers.map(({ nickname }) => nickname),
    ...soulmatesOf(game.results, game.playerId).flatMap((playerId) =>
      game.players.filter((player) => player.playerId === playerId).map(({ nickname }) => nickname),
    ),
  ];
  const named = [...new Set(others)];

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <p className={styles.label}>{t('end.label')}</p>
      </header>
      <main className={styles.main} tabIndex={0} aria-labelledby={titleId}>
        <div className={styles.summary}>
          <div className={styles.heading}>
            <h1 id={titleId} className={styles.title}>
              {t('end.title')}
            </h1>
            <img src={mascotCelebrating} alt={t('end.mascot')} width={88} height={88} />
          </div>
          {anonymous
            ? mine?.mentalist && (
                <span className={styles.mentalist}>
                  <Icon name="psychology" size={18} />
                  {t('ranking.mentalist')}
                </span>
              )
            : mine &&
              myTitles.length > 0 && (
                <ul className={styles.myTitles} data-testid="end-my-titles">
                  {myTitles.map(({ title }) => (
                    <li key={title} className={styles.mentalist}>
                      <Icon name={TITLE_ICONS[title]} size={18} />
                      {t(`results.titles.${title}`)}
                    </li>
                  ))}
                </ul>
              )}
          {!inGame && <p className={styles.place}>{t('end.notInGame')}</p>}
          {mine && game.ranking && (
            <p className={styles.place} data-testid="end-place">
              {anonymous
                ? t('end.place', {
                    position: mine.position,
                    players: game.ranking.length,
                    count: mine.points,
                  })
                : t('end.placeNominal', {
                    position: mine.position,
                    players: game.ranking.length,
                    count: mine.points,
                  })}
              {knowers.length > 0 &&
                ` ${t('end.knownBest', { names: list(knowers.map((player) => nameOf(player))) })}`}
            </p>
          )}
        </div>
        <div className={styles.actions}>
          {isHost && (
            <button type="button" className={styles.rematch} onClick={onRematch}>
              <Icon name="replay" size={20} />
              {t('end.rematch')}
            </button>
          )}
          {inGame && (
            <button type="button" className={styles.shareCard} onClick={() => setSharing(true)}>
              <Icon name="iosShare" size={20} />
              {anonymous ? t('end.shareGroupCard') : t('end.shareCard')}
            </button>
          )}
          {!isHost && host && (
            <p className={styles.rematchGuest}>{t('end.rematchGuest', { host: host.nickname })}</p>
          )}
        </div>
        {game.ranking && (
          <section className={styles.room} aria-labelledby={rankingId}>
            <h2 id={rankingId} className={styles.roomTitle}>
              {anonymous ? t('ranking.title') : t('ranking.nominalTitle')}
            </h2>
            <RankingList game={game} labelledBy={rankingId} />
          </section>
        )}
        {!anonymous && (game.results?.titles.length ?? 0) > 0 && (
          <section className={styles.room} aria-labelledby={titlesId}>
            <h2 id={titlesId} className={styles.roomTitle}>
              {t('end.titles')}
            </h2>
            <TitlesSummary game={game} labelledBy={titlesId} />
          </section>
        )}
        <section className={styles.room} aria-labelledby={roomId}>
          <h2 id={roomId} className={styles.roomTitle}>
            {t('end.inRoom', { count: staying.length })}
          </h2>
          <ul className={styles.avatars}>
            {staying.map((player) => (
              <li key={player.playerId} className={styles.inRoom}>
                <Avatar avatar={player.avatar} size="s" dimmed={!player.connected} />
                <span className={styles.inRoomName}>{nameOf(player)}</span>
              </li>
            ))}
          </ul>
          {gone.length > 0 && (
            <p className={styles.gone}>
              {t('end.gone', { count: gone.length, names: list(gone) })}
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
      {inGame && (
        <ShareCardSheet
          open={sharing}
          onOpenChange={setSharing}
          title={anonymous ? t('card.groupTitle') : t('card.personalTitle')}
          content={card}
          fileName={anonymous ? 'thelever-grupo.png' : 'thelever-mi-partida.png'}
        >
          {anonymous ? (
            <p className={cardStyles.note}>{t('card.groupNote')}</p>
          ) : (
            named.length > 0 && (
              <label className={cardStyles.switch}>
                <span>{t('card.showNames', { names: list(named) })}</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={showNames}
                  onChange={(event) => setShowNames(event.target.checked)}
                />
              </label>
            )
          )}
        </ShareCardSheet>
      )}
    </div>
  );
}
