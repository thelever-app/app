import type { DisconnectPlayerUseCase } from '@thelever-app/game';
import type { KeyedLock } from '../../concurrency/keyed-lock.ts';
import type { RunCommand } from '../run-command.ts';
import type { RoomConnection, Session } from './room-connection.ts';
import type { SocketNotifier } from './socket-notifier.ts';

/** A socket closed, for any reason: its player stops receiving on it and, if it was their last connection, disconnects. */
export class DisconnectHandler {
  readonly #disconnectPlayer: DisconnectPlayerUseCase;
  readonly #notifier: SocketNotifier;
  /** One holder per room at a time, so its commands never interleave in this instance. */
  readonly #roomLock: KeyedLock;
  readonly #runCommand: RunCommand;

  constructor(
    disconnectPlayer: DisconnectPlayerUseCase,
    notifier: SocketNotifier,
    roomLock: KeyedLock,
    runCommand: RunCommand,
  ) {
    this.#disconnectPlayer = disconnectPlayer;
    this.#notifier = notifier;
    this.#roomLock = roomLock;
    this.#runCommand = runCommand;
  }

  async handle(connection: RoomConnection): Promise<void> {
    const session = connection.session;
    if (!session) return;

    this.#notifier.unregister(session.playerId, connection);
    await this.end(session);
  }

  /** Closes the connection of that session in its room. Ending it again changes nothing. */
  async end(session: Session): Promise<void> {
    const release = await this.#roomLock.acquire(session.roomId);
    try {
      await this.#runCommand(() =>
        this.#disconnectPlayer.execute({
          roomId: session.roomId,
          playerId: session.playerId,
          connectionId: session.connectionId,
        }),
      );
    } finally {
      release();
    }
  }
}
