import type { Logger } from '@thelever-app/db';
import type { DeleteClosedRoomsUseCase } from '@thelever-app/game';
import { forgetSilentInstances, type InstanceCleaning } from '../rooms/silent-instances.ts';

/** What the scheduled sweep of the rooms needs. */
export interface RoomSweep extends InstanceCleaning {
  readonly deleteClosedRooms: DeleteClosedRoomsUseCase;
  /** How long without a sign before an instance is taken for dead, as the instances take it. */
  readonly silentAfterMs: number;
  readonly logger: Logger;
}

/**
 * Deletes every closed room with its game data. The connections of the instances that died without
 * saying so come first: with Cloud Run scaled to zero, no instance is left to close them, and their
 * rooms would look connected forever. The deletion runs outside a command: each room is read and
 * deleted on its own, and only if it did not change in between.
 */
export async function sweepRooms({
  deleteClosedRooms,
  silentAfterMs,
  logger,
  ...cleaning
}: RoomSweep): Promise<{ readonly deletedRoomIds: readonly string[] }> {
  await forgetSilentInstances(cleaning, { silentAfterMs });
  const { roomIds } = await deleteClosedRooms.execute();
  logger.info('closed rooms deleted', { count: roomIds.length });
  return { deletedRoomIds: roomIds };
}
