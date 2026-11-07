import type { Randomness } from '../ports/randomness.port.ts';

/** One of the items, each as likely as the others. */
export function pickOne<T>(items: readonly T[], randomness: Randomness): T {
  if (items.length === 0) throw new Error('There is nothing to pick from');
  return items[randomness.integer(items.length)] as T;
}

/** A copy of the items in random order (Fisher–Yates). */
export function shuffle<T>(items: readonly T[], randomness: Randomness): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = randomness.integer(index + 1);
    [shuffled[index], shuffled[other]] = [shuffled[other] as T, shuffled[index] as T];
  }
  return shuffled;
}
