import { GameEventsListener, type Logger, PostgresInstances } from '@thelever-app/db';
import type { DisconnectConnectionsUseCase } from '@thelever-app/game';
import type { KeyedLock } from '../concurrency/keyed-lock.ts';
import { GameEventDelivery } from '../rooms/game-event-delivery.ts';
import { InstanceKeeper } from '../rooms/instance-keeper.ts';
import type { RunCommand } from '../rooms/run-command.ts';
import type { RoomSocketServer } from '../rooms/sockets/room-socket-server.ts';
import type { SocketNotifier } from '../rooms/sockets/socket-notifier.ts';
import type { StateSender } from '../rooms/sockets/state-sender.ts';
import type { SharedStorage } from './storage.ts';

/** How the server stops. */
export interface Lifecycle {
  /** For SIGTERM: leaves cleanly, with the connections of this instance closed for everyone. */
  readonly shutdown: () => Promise<void>;
  /** Stops at once, as a process that dies would, without telling anyone. */
  readonly close: () => Promise<void>;
}

/** Stops serving: closes every socket with that code, without disconnecting anyone, and the HTTP server. */
export type StopServing = (code: number, reason: string) => Promise<void>;

/** What an instance needs to deliver what the others publish and to clean after the ones that die. */
export interface SharedLifecycleParts {
  readonly roomSockets: RoomSocketServer;
  readonly socketNotifier: SocketNotifier;
  readonly stateSender: StateSender;
  readonly roomLock: KeyedLock;
  readonly disconnectConnections: DisconnectConnectionsUseCase;
  readonly runCommand: RunCommand;
  readonly logger: Logger;
  readonly stopServing: StopServing;
}

/**
 * Joins the other instances: delivers to its own sockets what they publish, keeps itself seen alive
 * and cleans after the ones that die.
 */
export async function sharedLifecycle(
  storage: SharedStorage,
  {
    roomSockets,
    socketNotifier,
    stateSender,
    roomLock,
    disconnectConnections,
    runCommand,
    logger,
    stopServing,
  }: SharedLifecycleParts,
): Promise<Lifecycle> {
  const delivery = new GameEventDelivery(socketNotifier, stateSender, roomLock, logger, () =>
    roomSockets.connected(),
  );
  const listener = new GameEventsListener(storage.openListenClient, {
    onEvents: (playerIds, event, publishedAt) => {
      void delivery.deliver(playerIds, event, publishedAt);
    },
    onReconnected: () => {
      void delivery.catchUp();
    },
    logger,
  });
  await listener.start();
  const keeper = new InstanceKeeper(
    new PostgresInstances(storage.db),
    disconnectConnections,
    runCommand,
    {
      instanceId: storage.instanceId,
      beatEveryMs: storage.beatEveryMs,
      silentAfterMs: storage.silentAfterMs,
      // The clients come back and connect again, now that the instance is registered again.
      onForgotten: () => roomSockets.closeAll(1012, 'service restart'),
      logger,
    },
  );
  await keeper.start();

  return {
    close: async () => {
      keeper.stop();
      await listener.stop();
      await stopServing(1001, 'going away');
    },
    shutdown: async () => {
      keeper.stop();
      // The clients come back on another instance: 1012 is "service restart".
      const stopping = stopServing(1012, 'service restart');
      await keeper.leave();
      await listener.stop();
      await stopping;
    },
  };
}
