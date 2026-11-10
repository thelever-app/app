import { useState } from 'react';

/** A row of the list: a player in the room, or one who has just left and is still going. */
export interface PlayerRow<P> {
  readonly player: P;
  readonly leaving: boolean;
}

interface Leaving<P> {
  readonly player: P;
  /** Where the player was in the list, so the row goes from where it was. */
  readonly index: number;
}

/**
 * The players of the room plus those who have just left, in the place they had, so their row can
 * animate out; `gone` forgets one once its row has finished going.
 */
export function useLeavingPlayers<P extends { readonly playerId: string }>(
  players: readonly P[],
): { readonly rows: readonly PlayerRow<P>[]; readonly gone: (playerId: string) => void } {
  const [seen, setSeen] = useState(players);
  const [leaving, setLeaving] = useState<readonly Leaving<P>[]>([]);

  // When the room sends another list, whoever is no longer in it starts leaving.
  if (players !== seen) {
    setSeen(players);
    const inRoom = (playerId: string) => players.some((player) => player.playerId === playerId);
    const left = seen.flatMap((player, index) =>
      inRoom(player.playerId) ? [] : [{ player, index }],
    );
    setLeaving([...leaving.filter(({ player }) => !inRoom(player.playerId)), ...left]);
  }

  const rows: PlayerRow<P>[] = players.map((player) => ({ player, leaving: false }));
  for (const { player, index } of leaving) {
    rows.splice(Math.min(index, rows.length), 0, { player, leaving: true });
  }

  const gone = (playerId: string) =>
    setLeaving((current) => current.filter(({ player }) => player.playerId !== playerId));

  return { rows, gone };
}
