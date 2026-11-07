import type { LeaveRoomUseCase } from '@thelever-app/game';
import type { KeyedLock } from '../../concurrency/keyed-lock.ts';
import type { RunCommand } from '../run-command.ts';
import { Rejection } from './rejection.ts';
import type { RoomConnection } from './room-connection.ts';
import type { SocketMessageHandler } from './socket-message-handler.ts';
import type { SocketNotifier } from './socket-notifier.ts';

/**
 * `leave-room`: the player leaves the game on purpose. The others learn it by the event; the
 * connection of who left stops receiving for the room and closes, which disconnects nobody else.
 */
export class LeaveRoomHandler implements SocketMessageHandler<'leave-room'> {
  readonly type = 'leave-room';
  readonly #leaveRoom: LeaveRoomUseCase;
  readonly #notifier: SocketNotifier;
  /** One holder per room at a time, so its commands never interleave in this instance. */
  readonly #roomLock: KeyedLock;
  readonly #runCommand: RunCommand;

  constructor(
    leaveRoom: LeaveRoomUseCase,
    notifier: SocketNotifier,
    roomLock: KeyedLock,
    runCommand: RunCommand,
  ) {
    this.#leaveRoom = leaveRoom;
    this.#notifier = notifier;
    this.#roomLock = roomLock;
    this.#runCommand = runCommand;
  }

  async handle(_message: unknown, connection: RoomConnection): Promise<void> {
    const { session } = connection;
    if (!session) throw new Rejection('not-connected');

    const release = await this.#roomLock.acquire(session.roomId);
    try {
      await this.#runCommand(() =>
        this.#leaveRoom.execute({ roomId: session.roomId, playerId: session.playerId }),
      );
    } finally {
      release();
    }
    // Leaving already closed every connection of the player in the room.
    this.#notifier.unregister(session.playerId, connection);
    connection.session = undefined;
    connection.socket.close(1000, 'left');
  }
}
