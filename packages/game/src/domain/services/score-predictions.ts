import type { AnswerVO } from '../vos/answer.vo.ts';

/** The most points the predictions of a player give in a dilemma. */
export const MAXIMUM_POINTS = 100;

/**
 * The points of the vote predictions of every player in a dilemma: they share 100 among the other
 * players, and only the right ones count; null for who made none. A player who did not vote cannot
 * be predicted right.
 */
export function scorePredictions({
  playerIds,
  answerOf,
}: {
  readonly playerIds: readonly string[];
  readonly answerOf: (playerId: string) => AnswerVO | undefined;
}): Map<string, number | null> {
  const others = playerIds.length - 1;
  return new Map(
    playerIds.map((playerId) => {
      const votePredictions = answerOf(playerId)?.votePredictions ?? [];
      if (votePredictions.length === 0 || others === 0) return [playerId, null];

      const right = votePredictions.filter(
        (prediction) => answerOf(prediction.playerId)?.vote === prediction.vote,
      ).length;
      return [playerId, Math.round((MAXIMUM_POINTS * right) / others)];
    }),
  );
}
