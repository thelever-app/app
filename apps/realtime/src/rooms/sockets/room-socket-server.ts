import type { Server } from 'node:http';
import { ClientMessageDto, ClientMessageTypeDto, type ErrorCodeDto } from '@thelever-app/protocol';
import { WebSocketServer, type WebSocket } from 'ws';
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

  constructor(
    handlers: readonly SocketMessageHandler[],
    disconnect: DisconnectHandler,
    codeOf: (error: unknown) => ErrorCodeDto | undefined,
    pingIntervalMs: number,
  ) {
    this.#handlers = new Map(handlers.map((handler) => [handler.type, handler]));
    this.#disconnect = disconnect;
    this.#codeOf = codeOf;
    this.#pingIntervalMs = pingIntervalMs;
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

  #serve(connection: RoomConnection): void {
    connection.socket.on('message', (data) => {
      const { command, message } = read(String(data));
      this.#dispatch(message, connection).catch((error: unknown) => {
        const code = error instanceof Rejection ? error.code : this.#codeOf(error);
        if (code) {
          connection.send({ type: 'error', command, code });
          return;
        }
        console.error(error);
        connection.socket.close(1011, 'internal error');
      });
    });

    connection.socket.on('close', () => {
      this.#disconnect.handle(connection).catch(console.error);
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
