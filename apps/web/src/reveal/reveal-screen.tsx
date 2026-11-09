import type { GameStateDto } from '@thelever-app/protocol';
import { type CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../avatar/avatar.tsx';
import { GroupProgressSheet } from '../components/group-progress-sheet.tsx';
import { Icon } from '../components/icon.tsx';
import { isAnonymous, usePlayerName } from '../components/players.ts';
import { DilemmaText, personInTheGapOf } from '../game/dilemma-text.tsx';
import { GameMenu } from '../game/game-menu.tsx';
import styles from './reveal-screen.module.css';

type Game = GameStateDto;
type Reveal = NonNullable<Game['reveal']>;
type Player = Game['players'][number];

/** How many players fit in the head of the reveal at 360 px; the rest are shown as +N. */
const VISIBLE_PLAYERS = 6;

interface RevealScreenProps {
  readonly game: Game;
  readonly reveal: Reveal;
  /** Takes everyone to the next round; none on the last one. */
  readonly onMoveOn: (() => void) | undefined;
  readonly onLeave: () => void;
}

/**
 * The reveal of the dilemma of the round: how many chose each option and, in a nominal room, what
 * each one voted, who predicted it and who came closest; in an anonymous room, only the
 * distribution, or that there were too few votes to show it.
 */
export function RevealScreen({ game, reveal, onMoveOn, onLeave }: RevealScreenProps) {
  const { t } = useTranslation();
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const dilemma = game.dilemmas.find(({ dilemmaId }) => dilemmaId === reveal.dilemmaId)!;
  const person = personInTheGapOf(game, reveal);
  const anonymous = isAnonymous(game);
  const playerOf = (playerId: string | null) =>
    game.players.find((player) => player.playerId === playerId);
  const adder = playerOf(reveal.addedBy);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.top}>
          <p className={styles.position}>
            {t('reveal.position', { position: reveal.position + 1, total: game.dilemmas.length })}
          </p>
          <GameMenu onShowGroup={() => setIsGroupOpen(true)} onLeave={onLeave} />
        </div>
        <Players players={game.players} />
      </header>
      <main className={styles.main} aria-label={t('reveal.region')}>
        <h1 className={styles.text}>
          <DilemmaText text={dilemma.text} personInTheGap={person} />
        </h1>
        {(adder || person) && (
          <p className={styles.chips}>
            {adder && (
              <span className={styles.chip}>
                <Avatar avatar={adder.avatar} size="xs" />
                {t('reveal.addedBy', { name: adder.nickname })}
              </span>
            )}
            {person && (
              <span className={styles.chip}>
                <Icon name="personPin" size={18} />
                {t('reveal.about', { name: person })}
              </span>
            )}
          </p>
        )}
        {anonymous ? (
          <AnonymousResult game={game} reveal={reveal} dilemma={dilemma} person={person} />
        ) : (
          <NominalResult game={game} reveal={reveal} dilemma={dilemma} person={person} />
        )}
      </main>
      {onMoveOn && (
        <footer className={styles.footer}>
          <button type="button" className={styles.next} onClick={onMoveOn}>
            {t('reveal.next')}
          </button>
        </footer>
      )}
      <GroupProgressSheet game={game} open={isGroupOpen} onOpenChange={setIsGroupOpen} />
    </div>
  );
}

function Players({ players }: { readonly players: readonly Player[] }) {
  const { t } = useTranslation();
  const nameOf = usePlayerName();
  const inGame = players.filter(({ left }) => !left);
  const visible = inGame.slice(0, VISIBLE_PLAYERS);
  const hidden = inGame.length - visible.length;
  return (
    <div className={styles.players}>
      <ul className={styles.avatars}>
        {visible.map((player) => (
          <li key={player.playerId} title={nameOf(player)}>
            <Avatar avatar={player.avatar} size="xs" dimmed={!player.connected} />
            <span className={styles.hidden}>{nameOf(player)}</span>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <span className={styles.more}>{t('progressStrip.more', { count: hidden })}</span>
      )}
    </div>
  );
}

interface ResultProps {
  readonly game: Game;
  readonly reveal: Reveal;
  readonly dilemma: Game['dilemmas'][number];
  readonly person: string | undefined;
}

/** Each option of the dilemma with how many chose it, in the order of the catalog. */
function optionsOf({ reveal, dilemma }: Pick<ResultProps, 'reveal' | 'dilemma'>) {
  const counts = reveal.distribution ?? [];
  const total = counts.reduce((sum, { count }) => sum + count, 0);
  const layout = counts.length === 2 ? 'pair' : 'list';
  return counts.map(({ optionId, count }, index) => ({
    optionId,
    count,
    text: dilemma.options.find((option) => option.optionId === optionId)?.text ?? '',
    percent: `${total === 0 ? 0 : Math.round((count / total) * 100)}%`,
    color:
      layout === 'pair' ? `var(--color-option-${'ab'[index]})` : `var(--color-option-${index + 1})`,
  }));
}

function Bar({ percent, color }: { readonly percent: string; readonly color: string }) {
  const style = { '--share': percent, '--option': color } as CSSProperties;
  return (
    <div aria-hidden="true" className={styles.track}>
      <div className={styles.bar} style={style} />
    </div>
  );
}

function NominalResult({ game, reveal, dilemma, person }: ResultProps) {
  const { t, i18n } = useTranslation();
  const nameOf = usePlayerName();
  const list = (names: readonly string[]) =>
    new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(names);
  const playerOf = (playerId: string) =>
    game.players.find((player) => player.playerId === playerId);
  const hitsOn = (playerId: string) =>
    reveal.votePredictions.filter(({ aboutId, right }) => aboutId === playerId && right).length;

  const own = reveal.votePredictions.filter(({ playerId }) => playerId === game.playerId);
  const readers = reveal.votePredictions
    .filter(({ aboutId, right }) => aboutId === game.playerId && right)
    .flatMap(({ playerId }) => playerOf(playerId)?.nickname ?? []);
  const absent = reveal.votes.flatMap(({ playerId, vote }) =>
    vote === null ? (playerOf(playerId) ?? []) : [],
  );
  const closest = reveal.matchPredictions.toSorted((a, b) => a.distance - b.distance);

  return (
    <>
      {own.length > 0 && (
        <div className={styles.hits}>
          <Icon name="target" size={22} />
          <p>
            <strong>
              {t('reveal.yourHits', {
                right: own.filter(({ right }) => right).length,
                count: own.length,
              })}
            </strong>
            {readers.length > 0 && <> {t('reveal.readYou', { names: list(readers) })}</>}
          </p>
        </div>
      )}
      {optionsOf({ reveal, dilemma }).map((option) => {
        const voters = reveal.votes.flatMap(({ playerId, vote }) =>
          vote === option.optionId ? (playerOf(playerId) ?? []) : [],
        );
        return (
          <section key={option.optionId} className={styles.option}>
            <div className={styles.optionHead}>
              <h2 className={styles.optionText}>
                <DilemmaText text={option.text} personInTheGap={person} />
              </h2>
              <span className={styles.optionCount}>
                {t('reveal.optionCount', { count: option.count, percent: option.percent })}
              </span>
            </div>
            <Bar percent={option.percent} color={option.color} />
            {voters.length > 0 && (
              <ul className={styles.voters}>
                {voters.map((voter) => {
                  const hits = hitsOn(voter.playerId);
                  return (
                    <li
                      key={voter.playerId}
                      className={styles.voter}
                      data-self={voter.playerId === game.playerId || undefined}
                      aria-label={t('reveal.voterHits', { name: nameOf(voter), count: hits })}
                    >
                      <Avatar avatar={voter.avatar} size="s" />
                      <span aria-hidden="true" className={styles.voterHits}>
                        {hits}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
      {absent.length > 0 && (
        <p className={styles.absent}>
          <span className={styles.absentAvatars}>
            {absent.map((player) => (
              <Avatar key={player.playerId} avatar={player.avatar} size="xs" />
            ))}
          </span>
          {t('reveal.didNotVote', { names: list(absent.map((player) => nameOf(player))) })}
        </p>
      )}
      {reveal.votePredictions.length > 0 && <p className={styles.hint}>{t('reveal.hitsHint')}</p>}
      {closest.length > 0 && (
        <section className={styles.closest} aria-label={t('reveal.closestTitle')}>
          <h2 className={styles.closestTitle}>{t('reveal.closestTitle')}</h2>
          <ul className={styles.closestList}>
            {closest.flatMap(({ playerId, distance }) => {
              const player = playerOf(playerId);
              if (!player) return [];
              const best = reveal.closestIds.includes(playerId);
              return [
                <li key={playerId} className={styles.closestRow} data-best={best || undefined}>
                  <Avatar avatar={player.avatar} size="xs" />
                  <span className={styles.closestName}>{nameOf(player)}</span>
                  <span className={styles.distance}>
                    {distance === 0 ? t('reveal.exact') : t('reveal.away', { count: distance })}
                  </span>
                  {best && <span className={styles.best}>{t('reveal.closest')}</span>}
                </li>,
              ];
            })}
          </ul>
        </section>
      )}
    </>
  );
}

function AnonymousResult({ game, reveal, dilemma, person }: ResultProps) {
  const { t } = useTranslation();
  const didNot = reveal.didNotVoteCount;

  if (reveal.distribution === null) {
    const voted = Math.max(0, game.players.length - didNot);
    return (
      <div role="status" className={styles.fewVotes}>
        <Icon name="visibilityOff" size={24} />
        <div className={styles.fewVotesText}>
          <p className={styles.fewVotesTitle}>{t('reveal.fewVotesTitle')}</p>
          <p className={styles.fewVotesBody}>
            {voted === 0 ? t('reveal.fewVotesNobody') : t('reveal.fewVotesVoted', { count: voted })}
            {voted > 0 && didNot > 0 && <> {t('reveal.fewVotesDidNot', { count: didNot })}</>}.{' '}
            {t('reveal.fewVotesWhy')}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.distribution}>
      {optionsOf({ reveal, dilemma }).map((option) => (
        <section key={option.optionId} className={styles.anonymousOption}>
          <div className={styles.optionHead}>
            <h2 className={styles.optionText}>
              <DilemmaText text={option.text} personInTheGap={person} />
            </h2>
            <span className={styles.optionCount}>
              {t('reveal.optionCount', { count: option.count, percent: option.percent })}
            </span>
          </div>
          <Bar percent={option.percent} color={option.color} />
        </section>
      ))}
      <p className={styles.hint}>
        {didNot > 0 && <>{t('reveal.anonymousDidNotVote', { count: didNot })} </>}
        {t('reveal.anonymousNote')}
      </p>
    </div>
  );
}
