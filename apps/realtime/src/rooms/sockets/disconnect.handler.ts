import type { DisconnectPlayerUseCase } from '@thelever-app/game';
import type { KeyedLock } from '../../concurrency/keyed-lock.ts';
import type { RoomConnection } from './room-connection.ts';
import type { SocketNotifier } from './socket-notifier.ts';

/** A socket closed, for any reason: its player stops receiving and, if it was their current connection, disconnects. */
export class DisconnectHandler {
  readonly #disconnectPlayer: DisconnectPlayerUseCase;
  readonly #notifier: SocketNotifier;
  /** One holder per game at a time, so its commands never interleave in this instance. */
  readonly #gameLock: KeyedLock;

  constructor(
    disconnectPlayer: DisconnectPlayerUseCase,
    notifier: SocketNotifier,
    gameLock: KeyedLock,
  ) {
    this.#disconnectPlayer = disconnectPlayer;
    this.#notifier = notifier;
    this.#gameLock = gameLock;
  }

  async handle(connection: RoomConnection): Promise<void> {
    const session = connection.session;
    if (!session) return;

    this.#notifier.unregister(session.playerId, connection.socket);
    const release = await this.#gameLock.acquire(session.gameId);
    try {
      await this.#disconnectPlayer.execute({
        gameId: session.gameId,
        playerId: session.playerId,
        connectionId: session.connectionId,
      });
    } finally {
      release();
    }
  }
}
