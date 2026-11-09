import type { GameStateDto } from '@thelever-app/protocol';
import { type CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../avatar/avatar.tsx';
import { GroupProgressSheet } from '../components/group-progress-sheet.tsx';
import { Icon } from '../components/icon.tsx';
import { isAnonymous, usePlayerName } from '../components/players.ts';
import { DilemmaText, personInTheGapOf } from '../game/dilemma-text.tsx';
import { GameMenu } from '../game/game-menu.tsx';
import { missedOf } from './missed.ts';
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
 * each one voted, with how the predictions of the player went next to each vote; in an anonymous room, only the distribution, or that
 * there were too few votes to show it.
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

/** How many hits a segment each fit in the summary; with more, a single bar. */
const MAX_SEGMENTS = 6;

/**
 * Each option of the dilemma with how many chose it, its letter and its colour by position: in the
 * order this player saw them when voting, or in the order of the catalog for an anonymous room.
 */
function optionsOf(
  { reveal, dilemma }: Pick<ResultProps, 'reveal' | 'dilemma'>,
  order: 'player' | 'catalog',
) {
  const counts = reveal.distribution ?? [];
  const total = counts.reduce((sum, { count }) => sum + count, 0);
  const ids =
    order === 'player'
      ? dilemma.options.map(({ optionId }) => optionId)
      : counts.map(({ optionId }) => optionId);
  const layout = ids.length === 2 ? 'pair' : 'list';
  return ids.map((optionId, index) => {
    const count = counts.find((option) => option.optionId === optionId)?.count ?? 0;
    return {
      optionId,
      count,
      letter: String.fromCharCode(65 + index),
      text: dilemma.options.find((option) => option.optionId === optionId)?.text ?? '',
      percent: `${total === 0 ? 0 : Math.round((count / total) * 100)}%`,
      color:
        layout === 'pair'
          ? `var(--color-option-${'ab'[index]})`
          : `var(--color-option-${index + 1})`,
    };
  });
}

function Bar({ percent, color }: { readonly percent: string; readonly color: string }) {
  const style = { '--share': percent, '--option': color } as CSSProperties;
  return (
    <div aria-hidden="true" className={styles.track}>
      <div className={styles.bar} style={style} />
    </div>
  );
}

/** How the predictions of the player went on those who voted: right ones, and who they missed. */
function HitsSummary({
  right,
  missed,
}: {
  readonly right: number;
  readonly missed: readonly string[];
}) {
  const { t, i18n } = useTranslation();
  const count = right + missed.length;
  const all = missed.length === 0;
  const list = (names: readonly string[]) =>
    new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(names);
  const named = missedOf(missed);
  const text = all
    ? t('reveal.hitsCount', { right, count })
    : right === 0
      ? t('reveal.missedAll')
      : named.key === 'one'
        ? t('reveal.missedOne', { name: named.name })
        : named.key === 'some'
          ? t('reveal.missedSome', { names: list(named.names) })
          : named.key === 'many'
            ? t('reveal.missedMany', { names: named.names.join(', '), count: named.more })
            : '';
  const share = { '--share': `${count === 0 ? 0 : (right / count) * 100}%` } as CSSProperties;
  return (
    <section className={styles.summary} aria-label={t('reveal.yourHitsRegion')} data-all={all}>
      <div className={styles.summaryHead}>
        <Icon name={all ? 'checkCircle' : 'target'} size={32} />
        <div className={styles.summaryText}>
          <p className={styles.summaryTitle}>
            {all ? t('reveal.hitsAll') : t('reveal.hitsCount', { right, count })}
          </p>
          <p className={styles.summaryLine}>{text}</p>
        </div>
      </div>
      {count <= MAX_SEGMENTS ? (
        <div aria-hidden="true" className={styles.segments}>
          {Array.from({ length: count }, (_, index) => (
            <span key={index} className={styles.segment} data-right={index < right || undefined} />
          ))}
        </div>
      ) : (
        <div aria-hidden="true" className={styles.progress}>
          <div className={styles.progressBar} style={share} />
        </div>
      )}
    </section>
  );
}

function NominalResult({ game, reveal, dilemma, person }: ResultProps) {
  const { t, i18n } = useTranslation();
  const nameOf = usePlayerName();
  const list = (names: readonly string[]) =>
    new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(names);
  const playerOf = (playerId: string) =>
    game.players.find((player) => player.playerId === playerId);
  const options = optionsOf({ reveal, dilemma }, 'player');
  const letterOf = (optionId: string) =>
    options.find((option) => option.optionId === optionId)?.letter ?? '';

  // What the player said of each one who voted; nobody predicts who did not vote.
  const voted = new Set(
    reveal.votes.flatMap(({ playerId, vote }) => (vote === null ? [] : playerId)),
  );
  const said = new Map(
    reveal.votePredictions
      .filter(({ playerId, aboutId }) => playerId === game.playerId && voted.has(aboutId))
      .map((prediction) => [prediction.aboutId, prediction]),
  );
  const missed = [...said.values()]
    .filter(({ right }) => !right)
    .flatMap(({ aboutId }) => playerOf(aboutId)?.nickname ?? []);
  const absent = reveal.votes.flatMap(({ playerId, vote }) =>
    vote === null ? (playerOf(playerId) ?? []) : [],
  );

  return (
    <>
      {said.size > 0 && <HitsSummary right={said.size - missed.length} missed={missed} />}
      <h2 className={styles.whoVoted}>{t('reveal.whoVoted')}</h2>
      {options.map((option) => {
        const voters = reveal.votes.flatMap(({ playerId, vote }) =>
          vote === option.optionId ? (playerOf(playerId) ?? []) : [],
        );
        const style = { '--option': option.color } as CSSProperties;
        return (
          <section key={option.optionId} className={styles.option}>
            <div className={styles.optionHead}>
              <span aria-hidden="true" className={styles.letter} style={style}>
                {option.letter}
              </span>
              <h3 className={styles.optionText}>
                <DilemmaText text={option.text} personInTheGap={person} />
              </h3>
              <span className={styles.optionCount}>
                {t('reveal.optionCount', { count: option.count, percent: option.percent })}
              </span>
            </div>
            <Bar percent={option.percent} color={option.color} />
            {voters.length === 0 ? (
              <p className={styles.nobody}>{t('reveal.nobodyChose')}</p>
            ) : (
              <ul className={styles.voters}>
                {voters.map((voter) => {
                  const prediction = said.get(voter.playerId);
                  const result =
                    voter.playerId === game.playerId
                      ? 'self'
                      : prediction === undefined
                        ? 'none'
                        : prediction.right
                          ? 'right'
                          : 'missed';
                  const letter = prediction ? letterOf(prediction.vote) : '';
                  const label =
                    result === 'right'
                      ? t('reveal.voterRight', { name: nameOf(voter) })
                      : result === 'missed'
                        ? t('reveal.voterMissed', { name: nameOf(voter), letter })
                        : nameOf(voter);
                  return (
                    <li
                      key={voter.playerId}
                      className={styles.voter}
                      data-result={result}
                      aria-label={label}
                    >
                      <Avatar avatar={voter.avatar} size="s" />
                      <span aria-hidden="true">{nameOf(voter)}</span>
                      {result === 'missed' && (
                        <span aria-hidden="true" className={styles.guess}>
                          {t('reveal.guessed', { letter })}
                        </span>
                      )}
                      {(result === 'right' || result === 'missed') && (
                        <Icon name={result === 'right' ? 'check' : 'close'} size={18} />
                      )}
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
      {optionsOf({ reveal, dilemma }, 'catalog').map((option) => (
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
