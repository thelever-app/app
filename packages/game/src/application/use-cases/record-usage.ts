import type { Game } from '../../domain/entities/game.ts';
import type { Room } from '../../domain/entities/room.ts';
import type { Usage, UsageFact } from '../ports/usage.port.ts';

/** Records a fact of use, which never fails the command that saved what happened. */
export async function recordUsage(usage: Usage, fact: UsageFact): Promise<void> {
  try {
    await usage.record(fact);
  } catch {
    // The analytics lose this fact; the game goes on as it is.
  }
}

/**
 * Who plays the game, as the room knows them: the identities, each once and none of a forgotten
 * player, and how many they are, the forgotten ones too.
 */
export function playersOf(
  room: Room,
  game: Game,
): { readonly identities: string[]; readonly players: number } {
  const playing = room.players.filter(({ id }) => game.playerIds.includes(id));
  const identities = playing.filter(({ forgotten }) => !forgotten).map(({ identity }) => identity);
  return { identities: [...new Set(identities)], players: playing.length };
}

/** Records that the game reached its end, if the command just took it there. */
export async function recordEndIfJustEnded(
  usage: Usage,
  room: Room,
  game: Game,
  stageBefore: string,
): Promise<void> {
  if (stageBefore === 'ended' || game.stage.kind !== 'ended') return;
  await recordUsage(usage, {
    kind: 'game-ended',
    ...playersOf(room, game),
    roomId: room.id,
    gameId: game.id,
  });
}
