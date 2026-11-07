import type { ConnectPlayerUseCase } from '@thelever-app/game';
import { CONTRACT_VERSION, type ConnectDto } from '@thelever-app/protocol';
import { WebSocket } from 'ws';
import type { AppCheckVerifier } from '../../identity/app-check-verifier.ts';
import type { TokenVerifier } from '../../identity/token-verifier.ts';
import type { KeyedLock } from '../../concurrency/keyed-lock.ts';
import type { RunCommand } from '../run-command.ts';
import type { DisconnectHandler } from './disconnect.handler.ts';
import type { StateSender } from './state-sender.ts';
import { Rejection } from './rejection.ts';
import type { RoomConnection, Session } from './room-connection.ts';
import type { SocketMessageHandler } from './socket-message-handler.ts';
import type { SocketNotifier } from './socket-notifier.ts';

/** `connect`: the first message of every connection, and again after each reconnection. */
export class ConnectHandler implements SocketMessageHandler<'connect'> {
  readonly type = 'connect';
  readonly #connectPlayer: ConnectPlayerUseCase;
  readonly #tokenVerifier: TokenVerifier;
  readonly #appCheckVerifier: AppCheckVerifier;
  readonly #notifier: SocketNotifier;
  /** One holder per room at a time, so its commands never interleave in this instance. */
  readonly #roomLock: KeyedLock;
  readonly #stateSender: StateSender;
  readonly #disconnect: DisconnectHandler;
  readonly #runCommand: RunCommand;

  constructor(
    connectPlayer: ConnectPlayerUseCase,
    tokenVerifier: TokenVerifier,
    appCheckVerifier: AppCheckVerifier,
    notifier: SocketNotifier,
    roomLock: KeyedLock,
    stateSender: StateSender,
    disconnect: DisconnectHandler,
    runCommand: RunCommand,
  ) {
    this.#connectPlayer = connectPlayer;
    this.#tokenVerifier = tokenVerifier;
    this.#appCheckVerifier = appCheckVerifier;
    this.#notifier = notifier;
    this.#roomLock = roomLock;
    this.#stateSender = stateSender;
    this.#disconnect = disconnect;
    this.#runCommand = runCommand;
  }

  async handle(
    { contractVersion, token, appCheckToken, roomId, language }: ConnectDto,
    connection: RoomConnection,
  ): Promise<void> {
    if (contractVersion !== CONTRACT_VERSION) throw new Rejection('unsupported-contract-version');
    await this.#appCheckVerifier.verify(appCheckToken);
    const identity = await this.#tokenVerifier.verify(token);

    const previous = connection.session;
    let session: Session;
    const release = await this.#roomLock.acquire(roomId);
    try {
      const { playerId, connectionId } = await this.#runCommand(() =>
        this.#connectPlayer.execute({ roomId, identity }),
      );
      // A socket that connects again, to another room or as another player, stops receiving for the previous one.
      if (previous) this.#notifier.unregister(previous.playerId, connection);
      session = { roomId, playerId, connectionId, language };
      connection.session = session;
      this.#notifier.register(playerId, connection);
      await this.#stateSender.send(connection, session);
    } finally {
      release();
    }

    // Nothing else ends the previous session: when the socket closes, only this one ends.
    if (previous) await this.#disconnect.end(previous);
    // A socket that closed while connecting was handled before it had this session.
    if (connection.socket.readyState === WebSocket.CLOSED) {
      this.#notifier.unregister(session.playerId, connection);
      await this.#disconnect.end(session);
    }
  }
}
