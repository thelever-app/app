import type { AnswerVO } from '../vos/answer.vo.ts';

/** The most points each kind of prediction gives in a dilemma: the match one and the vote ones together. */
export const MAXIMUM_POINTS = 100;

/** What the predictions of a player scored in a dilemma; null for a kind they did not make. */
export interface PredictionPoints {
  readonly match: number | null;
  readonly votes: number | null;
}

/**
 * The points of every prediction made in a dilemma, by proximity: the match prediction gives more
 * the closer it is to how many of the others voted the same, up to 100 when exact; the vote
 * predictions share 100 among the players of the subset, and only the right ones count. A player
 * who did not vote cannot be predicted right.
 */
export function scorePredictions({
  playerIds,
  answerOf,
  subsetOf,
}: {
  readonly playerIds: readonly string[];
  readonly answerOf: (playerId: string) => AnswerVO | undefined;
  readonly subsetOf: (playerId: string) => readonly string[];
}): Map<string, PredictionPoints> {
  const others = playerIds.length - 1;
  return new Map(
    playerIds.map((playerId) => {
      const answer = answerOf(playerId);
      if (!answer) return [playerId, { match: null, votes: null }];

      const { matchPrediction, votePredictions } = answer;
      const same = playerIds.filter(
        (other) => other !== playerId && answerOf(other)?.vote === answer.vote,
      ).length;
      const match =
        matchPrediction === null || others === 0
          ? null
          : Math.round(MAXIMUM_POINTS * (1 - Math.abs(matchPrediction - same) / others));

      const subset = subsetOf(playerId);
      const right = votePredictions.filter(
        (prediction) => answerOf(prediction.playerId)?.vote === prediction.vote,
      ).length;
      const votes =
        votePredictions.length === 0 || subset.length === 0
          ? null
          : Math.round((MAXIMUM_POINTS * right) / subset.length);

      return [playerId, { match, votes }];
    }),
  );
}
