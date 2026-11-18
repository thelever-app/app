import { MINIMUM_VOTES_TO_SHOW } from '../vos/votes-to-show.ts';

/**
 * Of the dilemmas played, the one whose distribution is closest to an even split among its
 * options: the least sum of how far the share of each option is from an even one. The first one on
 * a tie. Only the dilemmas with at least 3 votes, whose distribution can be shown; null without any.
 */
export function mostDivisiveDilemma(
  dilemmas: readonly {
    readonly dilemmaId: string;
    readonly distribution: readonly { readonly optionId: string; readonly count: number }[] | null;
  }[],
): string | null {
  let best: { readonly dilemmaId: string; readonly off: number } | null = null;
  for (const { dilemmaId, distribution } of dilemmas) {
    const votes = distribution?.reduce((total, { count }) => total + count, 0) ?? 0;
    if (!distribution || votes < MINIMUM_VOTES_TO_SHOW) continue;
    // In shares times the votes times the options, so it stays exact.
    const options = distribution.length;
    const off =
      distribution.reduce((total, { count }) => total + Math.abs(count * options - votes), 0) /
      (votes * options);
    if (best === null || off < best.off) best = { dilemmaId, off };
  }
  return best?.dilemmaId ?? null;
}
