import type { Randomness } from '../ports/randomness.port.ts';
import { shuffle } from './random-choice.ts';

/** The most players whose vote each player predicts in a dilemma (K). */
export const PREDICTION_LIMIT = 4;

/**
 * Who each player predicts in each dilemma of a game, by position of the dilemma. Players are put
 * in a random order once; in each dilemma everyone predicts the next min(K, N − 1) players of that
 * order, shifted from one dilemma to the next. So every player is predicted exactly as many times
 * as the others in each dilemma, and who predicts whom changes along the game.
 */
export function predictionSubsets(
  playerIds: readonly string[],
  dilemmaCount: number,
  randomness: Randomness,
  limit = PREDICTION_LIMIT,
): Map<string, string[][]> {
  const order = shuffle(playerIds, randomness);
  const others = order.length - 1;
  const size = Math.min(limit, others);
  const subsets = new Map(order.map((playerId) => [playerId, [] as string[][]]));

  for (let position = 0; position < dilemmaCount; position += 1) {
    const shift = others === 0 ? 0 : (position * size) % others;
    order.forEach((playerId, index) => {
      const predicted = Array.from({ length: size }, (_, step) => {
        const offset = ((shift + step) % others) + 1;
        return order[(index + offset) % order.length] as string;
      });
      subsets.get(playerId)?.push(predicted);
    });
  }
  return subsets;
}
