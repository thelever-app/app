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

/** The identities of who plays the game, each once, as the room knows them. */
export function identitiesOf(room: Room, game: Game): string[] {
  const identities = room.players
    .filter(({ id }) => game.playerIds.includes(id))
    .map(({ identity }) => identity);
  return [...new Set(identities)];
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
    identities: identitiesOf(room, game),
    roomId: room.id,
    gameId: game.id,
  });
}
