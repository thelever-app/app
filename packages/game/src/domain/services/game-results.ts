import { rankByPoints, type RankedPlayer } from './rank-by-points.ts';
import { pointsOfVotePrediction } from './score-vote-predictions.ts';

/** The titles of a game of a nominal room, in the order they are shown, El Mentalista the last. */
export const TITLES = [
  'almas-gemelas',
  'verso-suelto',
  'la-voz-del-grupo',
  'iman-de-reacciones',
  'enigma',
  'libro-abierto',
  'el-mentalista',
] as const;

export type Title = (typeof TITLES)[number];

/** Only who voted this many dilemmas can get a title; the one a player was the person in the gap of counts. */
export const MINIMUM_VOTED_FOR_A_TITLE = 3;

/**
 * Who holds a title, or comes right after: one player, or the pair of Almas gemelas, with the fact
 * that earned it: how many of how many, or the points of El Mentalista with nothing to count against.
 */
export interface TitleHolder {
  readonly playerIds: readonly string[];
  readonly count: number;
  readonly of: number | null;
}

export interface GameTitle {
  readonly title: Title;
  /** More than one on a tie, which shares the title. */
  readonly winners: readonly TitleHolder[];
  readonly runnersUp: readonly TitleHolder[];
}

/** Who predicted the votes of a player best, all of them on a tie, and their points; nobody without any. */
export interface KnownBest {
  readonly playerIds: readonly string[];
  readonly points: number;
}

export interface GameResults {
  /** Only the titles with a winner, in their order. */
  readonly titles: readonly GameTitle[];
  readonly ranking: readonly RankedPlayer[];
  /** For each player, who knows them best. */
  readonly knownBestBy: ReadonlyMap<string, KnownBest>;
}

/** What the results need of each dilemma played. */
export interface ResultsDilemma {
  readonly personInTheGap: string | null;
  /** The vote of each player who voted it. */
  readonly votes: ReadonlyMap<string, string>;
  readonly predictions: readonly {
    readonly playerId: string;
    readonly aboutId: string;
    readonly vote: string;
  }[];
  /** Who reacted to whose vote. */
  readonly voteReactions: readonly { readonly playerId: string; readonly aboutId: string }[];
}

/** A player of the results: their points and whether they are ranked, which who joined late is not. */
export interface ResultsPlayer {
  readonly playerId: string;
  readonly points: number;
  readonly ranked: boolean;
}

interface Candidate extends TitleHolder {
  readonly value: number;
}

/**
 * The results of a game of a nominal room: its titles, who knows each player best and the ranking.
 * Each title goes to the candidates with the best value, shared on a tie; it is skipped when the
 * best is nothing, for the titles that count something good, or when every candidate ties.
 */
export function gameResults({
  players,
  dilemmas,
}: {
  /** The players who are still in the game, in its order. */
  readonly players: readonly ResultsPlayer[];
  readonly dilemmas: readonly ResultsDilemma[];
}): GameResults {
  const playerIds = players.map(({ playerId }) => playerId);
  const eligible = playerIds.filter(
    (playerId) =>
      dilemmas.filter(
        ({ votes, personInTheGap }) => votes.has(playerId) || personInTheGap === playerId,
      ).length >= MINIMUM_VOTED_FOR_A_TITLE,
  );
  const pointsAbout = (playerId: string, aboutId: string) =>
    dilemmas.reduce(
      (total, { votes, predictions }) =>
        total +
        predictions
          .filter(
            (prediction) => prediction.playerId === playerId && prediction.aboutId === aboutId,
          )
          .reduce(
            (sum, prediction) =>
              sum + pointsOfVotePrediction(votes, { playerId: aboutId, vote: prediction.vote }),
            0,
          ),
      0,
    );

  const mentalists = players
    .filter(({ playerId, ranked }) => ranked && eligible.includes(playerId))
    .map(({ playerId, points }) => one(playerId, points, points, null));
  const candidatesOf: Record<Title, () => readonly Candidate[]> = {
    'almas-gemelas': () => soulmates(eligible, dilemmas, pointsAbout),
    'verso-suelto': () => byVotes(eligible, dilemmas, (count, most) => count < most),
    'la-voz-del-grupo': () =>
      byVotes(eligible, dilemmas, (count, most, tops) => count === most && tops === 1),
    'iman-de-reacciones': () =>
      eligible.map((playerId) => {
        const count = dilemmas.reduce(
          (total, { voteReactions }) =>
            total +
            voteReactions.filter(
              (reaction) => reaction.aboutId === playerId && reaction.playerId !== playerId,
            ).length,
          0,
        );
        return one(playerId, count, count, null);
      }),
    enigma: () => guessed(eligible, dilemmas),
    'libro-abierto': () => guessed(eligible, dilemmas),
    'el-mentalista': () => mentalists,
  };

  const titles = TITLES.flatMap((title): GameTitle[] => {
    const awarded = award(candidatesOf[title](), title === 'enigma' ? 'fewest' : 'most');
    return awarded ? [{ title, ...awarded }] : [];
  });
  const mentalistIds =
    titles
      .find(({ title }) => title === 'el-mentalista')
      ?.winners.flatMap(({ playerIds: holders }) => holders) ?? [];

  return {
    titles,
    ranking: rankByPoints(
      players.filter(({ ranked }) => ranked).map(({ playerId, points }) => ({ playerId, points })),
    ).map((ranked) => ({ ...ranked, mentalist: mentalistIds.includes(ranked.playerId) })),
    knownBestBy: new Map(
      playerIds.map((aboutId) => {
        const scored = playerIds
          .filter((playerId) => playerId !== aboutId)
          .map((playerId) => ({ playerId, points: pointsAbout(playerId, aboutId) }));
        const best = Math.max(0, ...scored.map(({ points }) => points));
        return [
          aboutId,
          {
            playerIds:
              best > 0
                ? scored.filter(({ points }) => points === best).map(({ playerId }) => playerId)
                : [],
            points: best,
          },
        ];
      }),
    ),
  };
}

function one(playerId: string, value: number, count: number, of: number | null): Candidate {
  return { playerIds: [playerId], value, count, of };
}

/**
 * The winners, with the best value, and the runners-up, with the next one. Nobody wins when every
 * candidate ties, nor, for the most, when the best is nothing; and nobody comes second with nothing.
 */
function award(
  candidates: readonly Candidate[],
  best: 'most' | 'fewest',
): Pick<GameTitle, 'winners' | 'runnersUp'> | null {
  const values = [...new Set(candidates.map(({ value }) => value))].sort((a, b) =>
    best === 'most' ? b - a : a - b,
  );
  const [top, next] = values;
  if (top === undefined) return null;
  if (best === 'most' && top <= 0) return null;
  if (candidates.length > 1 && values.length === 1) return null;
  const holders = (value: number | undefined) =>
    candidates
      .filter((candidate) => candidate.value === value)
      .map(({ playerIds, count, of }) => ({ playerIds, count, of }));
  const runnersUp = next === undefined || (best === 'most' && next <= 0) ? [] : holders(next);
  return { winners: holders(top), runnersUp };
}

/** How many of the dilemmas each player voted had their option counted as `counts` says. */
function byVotes(
  eligible: readonly string[],
  dilemmas: readonly ResultsDilemma[],
  counts: (count: number, most: number, tops: number) => boolean,
): Candidate[] {
  return eligible.map((playerId) => {
    const voted = dilemmas.filter(({ votes }) => votes.has(playerId));
    const count = voted.filter(({ votes }) => {
      const tally = new Map<string, number>();
      for (const vote of votes.values()) tally.set(vote, (tally.get(vote) ?? 0) + 1);
      const most = Math.max(...tally.values());
      const tops = [...tally.values()].filter((value) => value === most).length;
      return counts(tally.get(votes.get(playerId) as string) as number, most, tops);
    }).length;
    return one(playerId, count, count, voted.length);
  });
}

/** For each player predicted on a dilemma they voted, the share of those predictions that were right. */
function guessed(eligible: readonly string[], dilemmas: readonly ResultsDilemma[]): Candidate[] {
  return eligible.flatMap((playerId) => {
    const about = dilemmas.flatMap(({ votes, predictions }) =>
      votes.has(playerId)
        ? predictions
            .filter(({ aboutId }) => aboutId === playerId)
            .map(({ vote }) => vote === votes.get(playerId))
        : [],
    );
    if (about.length === 0) return [];
    const right = about.filter(Boolean).length;
    return [one(playerId, right / about.length, right, about.length)];
  });
}

/** Each pair of players who predicted each other, by the points they got predicting each other. */
function soulmates(
  eligible: readonly string[],
  dilemmas: readonly ResultsDilemma[],
  pointsAbout: (playerId: string, aboutId: string) => number,
): Candidate[] {
  return eligible.flatMap((first, index) =>
    eligible.slice(index + 1).flatMap((second) => {
      const mutual = dilemmas.flatMap(({ votes, predictions }) =>
        predictions
          .filter(
            ({ playerId, aboutId }) =>
              (playerId === first && aboutId === second) ||
              (playerId === second && aboutId === first),
          )
          .map(({ aboutId, vote }) => votes.get(aboutId) === vote),
      );
      if (mutual.length === 0) return [];
      return [
        {
          playerIds: [first, second],
          value: pointsAbout(first, second) + pointsAbout(second, first),
          count: mutual.filter(Boolean).length,
          of: mutual.length,
        },
      ];
    }),
  );
}
