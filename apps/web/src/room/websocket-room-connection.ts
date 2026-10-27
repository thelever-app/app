import {
  CONTRACT_VERSION,
  ServerMessageDto,
  type ClientMessageDto,
  type LanguageDto,
} from '@thelever-app/protocol';
import type {
  RoomConnection,
  RoomConnectionStatus,
  RoomConnectionStatusListener,
  ServerMessageListener,
} from './room-connection.ts';

/** The part of the browser's WebSocket this connection uses. */
export interface WebSocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(type: 'open' | 'close', listener: () => void): void;
  addEventListener(type: 'message', listener: (event: { readonly data: unknown }) => void): void;
}

/** Runs the callback after `ms` and returns the way to cancel it. */
export type Schedule = (callback: () => void, ms: number) => () => void;

export interface WebSocketRoomOptions {
  readonly url: string;
  readonly gameId: string;
  /** The language the player reads the dilemmas in. */
  readonly language: LanguageDto;
  /** The token of the player, asked for on every connection because it expires. */
  readonly getToken: () => Promise<string>;
  readonly createSocket: (url: string) => WebSocketLike;
  readonly schedule: Schedule;
  /** A number in [0, 1), for the random part of each wait. */
  readonly random: () => number;
}

const OPEN = 1;
/** The first wait after a drop, doubled on every failed attempt up to the longest one (ADR 0003). */
const SHORTEST_WAIT_MS = 500;
const LONGEST_WAIT_MS = 10_000;

/**
 * The screen's link to the room server. It opens a socket, says who connects with `connect`, and
 * hands every message of the server to the screen. When the socket drops for any reason, the
 * server's hourly cut too, it waits and connects again; the server answers with a fresh state.
 */
export class WebSocketRoomConnection implements RoomConnection {
  readonly #options: WebSocketRoomOptions;
  readonly #listeners = new Set<ServerMessageListener>();
  readonly #statusListeners = new Set<RoomConnectionStatusListener>();
  /** What the screen sent while not connected, sent once the server has the player back. */
  readonly #pending: ClientMessageDto[] = [];
  #socket: WebSocketLike | undefined;
  #status: RoomConnectionStatus = 'connecting';
  #failedAttempts = 0;
  #cancelWait: (() => void) | undefined;
  #closed = false;

  private constructor(options: WebSocketRoomOptions) {
    this.#options = options;
  }

  /** Opens the connection at once. */
  static open(options: WebSocketRoomOptions): WebSocketRoomConnection {
    const connection = new WebSocketRoomConnection(options);
    connection.#connect();
    return connection;
  }

  send(message: ClientMessageDto): void {
    if (this.#status === 'connected' && this.#socket?.readyState === OPEN) {
      this.#socket.send(JSON.stringify(message));
      return;
    }
    this.#pending.push(message);
  }

  subscribe(listener: ServerMessageListener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  subscribeStatus(listener: RoomConnectionStatusListener): () => void {
    this.#statusListeners.add(listener);
    listener(this.#status);
    return () => {
      this.#statusListeners.delete(listener);
    };
  }

  getStatus(): RoomConnectionStatus {
    return this.#status;
  }

  close(): void {
    this.#closed = true;
    this.#cancelWait?.();
    this.#socket?.close();
    this.#listeners.clear();
    this.#statusListeners.clear();
  }

  #connect(): void {
    const socket = this.#options.createSocket(this.#options.url);
    this.#socket = socket;
    socket.addEventListener('open', () => {
      this.#sayWhoConnects(socket).catch(() => socket.close());
    });
    socket.addEventListener('message', ({ data }) => this.#receive(data));
    socket.addEventListener('close', () => this.#onDrop(socket));
  }

  async #sayWhoConnects(socket: WebSocketLike): Promise<void> {
    const token = await this.#options.getToken();
    // The socket may have dropped, or been replaced, while the token was coming.
    if (socket !== this.#socket || socket.readyState !== OPEN) return;
    socket.send(
      JSON.stringify({
        type: 'connect',
        contractVersion: CONTRACT_VERSION,
        token,
        gameId: this.#options.gameId,
        language: this.#options.language,
      } satisfies ClientMessageDto),
    );
  }

  #receive(data: unknown): void {
    const message = parse(data);
    if (!message) return;

    if (message.type === 'game-state' && this.#status !== 'connected') {
      this.#failedAttempts = 0;
      this.#setStatus('connected');
      this.#sendPending();
    }
    for (const listener of this.#listeners) listener(message);
  }

  #sendPending(): void {
    for (const message of this.#pending.splice(0)) this.send(message);
  }

  #onDrop(socket: WebSocketLike): void {
    if (this.#closed || socket !== this.#socket) return;

    const backoff = Math.min(LONGEST_WAIT_MS, SHORTEST_WAIT_MS * 2 ** this.#failedAttempts);
    this.#failedAttempts += 1;
    this.#setStatus('reconnecting');
    this.#cancelWait = this.#options.schedule(() => {
      this.#cancelWait = undefined;
      this.#connect();
    }, this.#options.random() * backoff);
  }

  #setStatus(status: RoomConnectionStatus): void {
    if (status === this.#status) return;
    this.#status = status;
    for (const listener of this.#statusListeners) listener(status);
  }
}

/** The message, if the frame is text that follows the contract. */
function parse(data: unknown): ServerMessageDto | undefined {
  if (typeof data !== 'string') return undefined;
  try {
    return ServerMessageDto.safeParse(JSON.parse(data)).data;
  } catch {
    return undefined;
  }
}
