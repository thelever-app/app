import type { Randomness } from '../ports/randomness.port.ts';
import { pickOne } from './random-choice.ts';

/**
 * The player whose nickname takes the gap of each dilemma that has it, the same for everyone: chosen
 * at random among those not chosen yet, and among everyone again once all have been.
 */
export function peopleInTheGap(
  dilemmaIdsWithGap: readonly string[],
  playerIds: readonly string[],
  randomness: Randomness,
): Map<string, string> {
  const chosen = new Map<string, string>();
  let left: string[] = [];
  for (const dilemmaId of dilemmaIdsWithGap) {
    if (left.length === 0) left = [...playerIds];
    const person = pickOne(left, randomness);
    left = left.filter((playerId) => playerId !== person);
    chosen.set(dilemmaId, person);
  }
  return chosen;
}
