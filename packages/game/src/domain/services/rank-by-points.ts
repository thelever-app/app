/** A player in the ranking: their points, their position and whether they are El Mentalista. */
export interface RankedPlayer {
  readonly playerId: string;
  readonly points: number;
  /** From 1; players with the same points share it, and the next position skips the shared ones. */
  readonly position: number;
  /** Who leads the ranking with some points. */
  readonly mentalist: boolean;
}

/**
 * The players ordered by their points, the most first; on a tie, in the order they were given.
 * Whoever leads with some points is El Mentalista, all of them on a tie.
 */
export function rankByPoints(
  players: readonly { readonly playerId: string; readonly points: number }[],
): RankedPlayer[] {
  const ordered = [...players].sort((a, b) => b.points - a.points);
  return ordered.map(({ playerId, points }) => {
    const position = ordered.findIndex((other) => other.points === points) + 1;
    return { playerId, points, position, mentalist: position === 1 && points > 0 };
  });
}
