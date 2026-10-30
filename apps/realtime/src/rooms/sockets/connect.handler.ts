import type { ConnectPlayerUseCase } from '@thelever-app/game';
import { CONTRACT_VERSION, type ConnectDto } from '@thelever-app/protocol';
import { WebSocket } from 'ws';
import type { TokenVerifier } from '../../identity/token-verifier.ts';
import type { KeyedLock } from '../../concurrency/keyed-lock.ts';
import type { DisconnectHandler } from './disconnect.handler.ts';
import type { GameStateSender } from './game-state-sender.ts';
import { Rejection } from './rejection.ts';
import type { RoomConnection, Session } from './room-connection.ts';
import type { SocketMessageHandler } from './socket-message-handler.ts';
import type { SocketNotifier } from './socket-notifier.ts';

/** `connect`: the first message of every connection, and again after each reconnection. */
export class ConnectHandler implements SocketMessageHandler<'connect'> {
  readonly type = 'connect';
  readonly #connectPlayer: ConnectPlayerUseCase;
  readonly #tokenVerifier: TokenVerifier;
  readonly #notifier: SocketNotifier;
  /** One holder per game at a time, so its commands never interleave in this instance. */
  readonly #gameLock: KeyedLock;
  readonly #stateSender: GameStateSender;
  readonly #disconnect: DisconnectHandler;

  constructor(
    connectPlayer: ConnectPlayerUseCase,
    tokenVerifier: TokenVerifier,
    notifier: SocketNotifier,
    gameLock: KeyedLock,
    stateSender: GameStateSender,
    disconnect: DisconnectHandler,
  ) {
    this.#connectPlayer = connectPlayer;
    this.#tokenVerifier = tokenVerifier;
    this.#notifier = notifier;
    this.#gameLock = gameLock;
    this.#stateSender = stateSender;
    this.#disconnect = disconnect;
  }

  async handle(
    { contractVersion, token, gameId, language }: ConnectDto,
    connection: RoomConnection,
  ): Promise<void> {
    if (contractVersion !== CONTRACT_VERSION) throw new Rejection('unsupported-contract-version');
    const identity = await this.#tokenVerifier.verify(token);

    const previous = connection.session;
    let session: Session;
    const release = await this.#gameLock.acquire(gameId);
    try {
      const { playerId, connectionId } = await this.#connectPlayer.execute({ gameId, identity });
      // A socket that connects again, to another game or as another player, stops receiving for the previous one.
      if (previous) this.#notifier.unregister(previous.playerId, connection.socket);
      session = { gameId, playerId, connectionId, language };
      connection.session = session;
      this.#notifier.register(playerId, connection.socket);
      await this.#stateSender.send(connection, session);
    } finally {
      release();
    }

    // Nothing else ends the previous session: when the socket closes, only this one ends.
    if (previous) await this.#disconnect.end(previous);
    // A socket that closed while connecting was handled before it had this session.
    if (connection.socket.readyState === WebSocket.CLOSED) {
      this.#notifier.unregister(session.playerId, connection.socket);
      await this.#disconnect.end(session);
    }
  }
}
