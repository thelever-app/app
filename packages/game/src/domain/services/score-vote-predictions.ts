import type { VotePrediction } from '../vos/answer.vo.ts';

/** What a right vote prediction is worth at least: when every voter chose what the predicted player chose. */
const LEAST_POINTS = 10;
/** What a right vote prediction may add on top, the fewer voters chose what the predicted player chose. */
const SURPRISE_POINTS = 90;

/**
 * The points of a vote prediction: right, 10 + 90 × (1 − p), with p the share of the voters who
 * chose what the predicted player chose, rounded; wrong, or about who did not vote, nothing.
 */
export function pointsOfVotePrediction(
  votes: ReadonlyMap<string, string>,
  { playerId, vote }: VotePrediction,
): number {
  if (votes.get(playerId) !== vote) return 0;
  const same = [...votes.values()].filter((other) => other === vote).length;
  return Math.round(LEAST_POINTS + SURPRISE_POINTS * (1 - same / votes.size));
}

/**
 * The points of the vote predictions of each player in a dilemma: the points of each one, added
 * up; null for who made none.
 */
export function scoreVotePredictions({
  predictorIds,
  votes,
  predictionsOf,
}: {
  readonly predictorIds: readonly string[];
  /** The vote of each player who voted the dilemma. */
  readonly votes: ReadonlyMap<string, string>;
  readonly predictionsOf: (playerId: string) => readonly VotePrediction[];
}): Map<string, number | null> {
  return new Map(
    predictorIds.map((playerId) => {
      const predictions = predictionsOf(playerId);
      if (predictions.length === 0) return [playerId, null];
      return [
        playerId,
        predictions.reduce(
          (total, prediction) => total + pointsOfVotePrediction(votes, prediction),
          0,
        ),
      ];
    }),
  );
}
