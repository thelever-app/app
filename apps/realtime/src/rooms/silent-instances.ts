import type { PostgresInstances } from '@thelever-app/db';
import type { DisconnectConnectionsUseCase } from '@thelever-app/game';
import type { RunCommand } from './run-command.ts';

/** How often an instance gives a sign of life and looks for the instances that died. */
export const BEAT_EVERY_MS = 30_000;
/** How long without a sign before an instance is taken for dead and its connections closed. */
export const SILENT_AFTER_MS = 90_000;

/** What closing the connections of an instance takes, for an instance or for a scheduled job. */
export interface InstanceCleaning {
  readonly instances: PostgresInstances;
  readonly disconnectConnections: DisconnectConnectionsUseCase;
  readonly runCommand: RunCommand;
}

/**
 * Closes for everyone the connections that instance serves, room by room, as closed at that moment,
 * so their players are not seen connected forever and their rooms can close.
 */
export async function closeConnectionsOf(
  { instances, disconnectConnections, runCommand }: InstanceCleaning,
  instanceId: string,
  at: Date,
): Promise<void> {
  for (const room of await instances.connectionsOf(instanceId)) {
    await runCommand(() => disconnectConnections.execute({ ...room, at }));
  }
}

/**
 * Closes the connections of every other instance with no sign for that long, as closed when it was
 * last seen alive, and forgets it. Another instance may clean the same one at once: the lock of each
 * room puts them in order. If one still has connections, it was not dead after all, or it is cleaned
 * on the next look. Without `except`, every silent instance: for a job, which is no instance.
 */
export async function forgetSilentInstances(
  cleaning: InstanceCleaning,
  { silentAfterMs, except }: { readonly silentAfterMs: number; readonly except?: string },
): Promise<void> {
  const silent = await cleaning.instances.findSilent(
    except === undefined ? { forMs: silentAfterMs } : { forMs: silentAfterMs, except },
  );
  for (const { id, seenAt } of silent) {
    await closeConnectionsOf(cleaning, id, seenAt);
    await cleaning.instances.remove(id);
  }
}
