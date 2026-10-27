import type { WebSocketLike } from '../../src/room/websocket-room-connection.ts';

type Listener = (event: { readonly data: unknown }) => void;

/** A socket the test drives: it opens, receives and drops when the test says so, and records what is sent. */
export class FakeSocket implements WebSocketLike {
  readonly url: string;
  readyState = 0;
  readonly sent: string[] = [];
  closedByClient = false;
  readonly #listeners: Record<'open' | 'message' | 'close', Listener[]> = {
    open: [],
    message: [],
    close: [],
  };

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(type: 'open' | 'message' | 'close', listener: Listener): void {
    this.#listeners[type].push(listener);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closedByClient = true;
    this.readyState = 3;
  }

  /** The server accepts the connection. */
  open(): void {
    this.readyState = 1;
    for (const listener of this.#listeners.open) listener({ data: undefined });
  }

  /** A frame arrives from the server, as text. */
  receive(data: unknown): void {
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    for (const listener of this.#listeners.message) listener({ data: text });
  }

  /** The connection drops without the client asking for it. */
  drop(): void {
    this.readyState = 3;
    for (const listener of this.#listeners.close) listener({ data: undefined });
  }

  /** What was sent, already parsed. */
  sentMessages(): unknown[] {
    return this.sent.map((data) => JSON.parse(data) as unknown);
  }
}

/** A clock the test moves by hand: it records each wait and runs it when told. */
export class FakeScheduler {
  readonly waits: { readonly ms: number; readonly run: () => void; cancelled: boolean }[] = [];

  readonly schedule = (callback: () => void, ms: number): (() => void) => {
    const wait = { ms, run: callback, cancelled: false };
    this.waits.push(wait);
    return () => {
      wait.cancelled = true;
    };
  };

  /** Runs the last wait, as if its time had come. */
  runLast(): void {
    const wait = this.waits.at(-1);
    if (!wait || wait.cancelled) throw new Error('no wait pending');
    wait.run();
  }
}
