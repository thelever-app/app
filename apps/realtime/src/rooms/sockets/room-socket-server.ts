import type { Server } from 'node:http';
import { type Context, propagation, ROOT_CONTEXT, type Span } from '@opentelemetry/api';
import type { Logger } from '@thelever-app/db';
import { ClientMessageDto, ClientMessageTypeDto, type ErrorCodeDto } from '@thelever-app/protocol';
import { WebSocketServer, type WebSocket } from 'ws';
import { GAME_ID } from '../../telemetry/game-sampler.ts';
import { instruments } from '../../telemetry/instruments.ts';
import { inSpan, markFailed } from '../../telemetry/tracing.ts';
import type { DisconnectHandler } from './disconnect.handler.ts';
import { Rejection } from './rejection.ts';
import { RoomConnection } from './room-connection.ts';
import type { SocketMessageHandler } from './socket-message-handler.ts';

/** The message, if it follows the contract, and its type, if it is one the server knows. */
function read(data: string): {
  readonly command: ClientMessageTypeDto | null;
  readonly message: ClientMessageDto | undefined;
} {
  let raw: unknown;
  try {
    raw = JSON.parse(data);
  } catch {
    return { command: null, message: undefined };
  }
  const type = ClientMessageTypeDto.safeParse((raw as { type?: unknown } | null)?.type);
  const message = ClientMessageDto.safeParse(raw);
  return { command: type.success ? type.data : null, message: message.data };
}

/** How a message ended, as its duration is counted. */
type Outcome = 'ok' | 'rejected' | 'error';

/** The game a message is about: the one of the connection, or the one `connect` names. */
function gameIdOf(message: ClientMessageDto | undefined, connection: RoomConnection) {
  return connection.session?.gameId ?? (message?.type === 'connect' ? message.gameId : undefined);
}

/** The trace the device started for the command, if it sent one. */
function traceOf(message: ClientMessageDto | undefined): Context {
  return message?.traceparent
    ? propagation.extract(ROOT_CONTEXT, { traceparent: message.traceparent })
    : ROOT_CONTEXT;
}

/**
 * The room sockets: reads each message, hands it to the handler of its type and answers what
 * goes wrong with its code; checks that every socket is alive. A WebSocket starts as an HTTP
 * request that asks to upgrade, so `ws` takes those and Express keeps the rest, on the same port (ADR 0003).
 */
export class RoomSocketServer {
  readonly #handlers: ReadonlyMap<ClientMessageDto['type'], SocketMessageHandler>;
  readonly #disconnect: DisconnectHandler;
  readonly #codeOf: (error: unknown) => ErrorCodeDto | undefined;
  /** How often the server checks that each socket is still alive (ADR 0003). */
  readonly #pingIntervalMs: number;
  readonly #logger: Logger;
  /** The connections of this instance whose socket is open. */
  readonly #connections = new Set<RoomConnection>();
  /** Once the instance leaves, a closing socket no longer disconnects its player: whoever cleans after it does. */
  #leaving = false;

  constructor(
    handlers: readonly SocketMessageHandler[],
    disconnect: DisconnectHandler,
    codeOf: (error: unknown) => ErrorCodeDto | undefined,
    pingIntervalMs: number,
    logger: Logger,
  ) {
    this.#handlers = new Map(handlers.map((handler) => [handler.type, handler]));
    this.#disconnect = disconnect;
    this.#codeOf = codeOf;
    this.#pingIntervalMs = pingIntervalMs;
    this.#logger = logger;
  }

  /** Serves the sockets on that HTTP server and starts checking that they are alive. */
  attach(server: Server): WebSocketServer {
    const sockets = new WebSocketServer({ server });
    const alive = new WeakMap<WebSocket, boolean>();

    sockets.on('connection', (socket) => {
      alive.set(socket, true);
      socket.on('pong', () => alive.set(socket, true));
      this.#serve(new RoomConnection(socket));
    });

    // Every interval, a socket that did not answer the previous ping is ended; its close disconnects the player.
    const pings = setInterval(() => {
      for (const socket of sockets.clients) {
        if (!alive.get(socket)) {
          socket.terminate();
          continue;
        }
        alive.set(socket, false);
        socket.ping();
      }
    }, this.#pingIntervalMs);
    sockets.on('close', () => clearInterval(pings));

    return sockets;
  }

  /** The connections of this instance with a player connected. */
  connected(): readonly RoomConnection[] {
    return [...this.#connections].filter((connection) => connection.session !== undefined);
  }

  /**
   * Closes every socket with that code, for an instance that leaves, without disconnecting their
   * players: their connections are closed in the database by whoever cleans after the instance.
   */
  leave(code: number, reason: string): void {
    this.#leaving = true;
    this.closeAll(code, reason);
  }

  /** Closes every socket with that code, and keeps serving: each player disconnects as usual. */
  closeAll(code: number, reason: string): void {
    for (const connection of this.#connections) connection.socket.close(code, reason);
  }

  #serve(connection: RoomConnection): void {
    this.#connections.add(connection);
    instruments().openSockets.add(1);
    connection.socket.on('message', (data) => this.#onMessage(String(data), connection));
    connection.socket.on('close', () => this.#onClose(connection));
  }

  /** Handles one message in a span of its own, and times it by its type and how it ended. */
  async #onMessage(data: string, connection: RoomConnection): Promise<void> {
    const { command, message } = read(data);
    const type = command ?? 'unknown';
    const started = performance.now();
    const outcome = await inSpan(
      `ws ${type}`,
      { 'message.type': type, [GAME_ID]: gameIdOf(message, connection) },
      (span) => this.#handle(message, command, connection, span),
      { parent: traceOf(message) },
    );
    instruments().messageDuration.record(performance.now() - started, {
      'message.type': type,
      outcome,
    });
  }

  /** Runs the message, and answers what goes wrong: with its code, or by closing the socket. */
  async #handle(
    message: ClientMessageDto | undefined,
    command: ClientMessageTypeDto | null,
    connection: RoomConnection,
    span: Span,
  ): Promise<Outcome> {
    try {
      await this.#dispatch(message, connection);
      return 'ok';
    } catch (error) {
      const code = error instanceof Rejection ? error.code : this.#codeOf(error);
      if (code) {
        // The rules turning a command down is an answer, not a failure of the server.
        span.setAttribute('rejection.code', code);
        this.#logger.info('command rejected', { command: command ?? 'unknown', code });
        connection.send({ type: 'error', command, code });
        return 'rejected';
      }
      markFailed(span, error);
      this.#logger.error('socket message failed', error, { command: command ?? 'unknown' });
      connection.socket.close(1011, 'internal error');
      return 'error';
    }
  }

  #onClose(connection: RoomConnection): void {
    this.#connections.delete(connection);
    instruments().openSockets.add(-1);
    if (this.#leaving) return;
    inSpan('ws disconnect', { [GAME_ID]: connection.session?.gameId }, () =>
      this.#disconnect.handle(connection),
    ).catch((error: unknown) => {
      this.#logger.error('disconnecting a closed socket failed', error);
    });
  }

  async #dispatch(
    message: ClientMessageDto | undefined,
    connection: RoomConnection,
  ): Promise<void> {
    const handler = message && this.#handlers.get(message.type);
    if (!message || !handler) throw new Rejection('invalid-message');
    await handler.handle(message, connection);
  }
}
