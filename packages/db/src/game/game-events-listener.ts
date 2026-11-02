import type { DomainEvent } from '@thelever-app/game';
import type pg from 'pg';
import { GAME_EVENTS_CHANNEL, readNotification } from './postgres-player-notifier.ts';

const MAX_RETRY_MS = 30_000;

/** How the listening connection shows up in pg_stat_activity. */
export const LISTENER_APPLICATION_NAME = 'game_events_listener';

/**
 * Listens to the events every instance publishes, on a connection of its own (ADR 0003). If the
 * connection is lost it connects again, waiting longer each time, and says so: whatever was
 * published meanwhile is lost, and only a fresh state makes up for it.
 */
export class GameEventsListener {
  readonly #open: () => Promise<{
    readonly client: pg.Client;
    readonly close: () => Promise<void>;
  }>;
  readonly #onEvents: (playerIds: readonly string[], event: DomainEvent) => void;
  readonly #onReconnected: () => void;
  readonly #initialRetryMs: number;
  #current: { readonly client: pg.Client; readonly close: () => Promise<void> } | undefined;
  #processId: number | undefined;
  #retry: ReturnType<typeof setTimeout> | undefined;
  #stopped = false;

  constructor(
    open: () => Promise<{ readonly client: pg.Client; readonly close: () => Promise<void> }>,
    {
      onEvents,
      onReconnected = () => {},
      initialRetryMs = 500,
    }: {
      readonly onEvents: (playerIds: readonly string[], event: DomainEvent) => void;
      readonly onReconnected?: () => void;
      readonly initialRetryMs?: number;
    },
  ) {
    this.#open = open;
    this.#onEvents = onEvents;
    this.#onReconnected = onReconnected;
    this.#initialRetryMs = initialRetryMs;
  }

  /** The server process of the listening connection, while there is one. */
  get processId(): number | undefined {
    return this.#processId;
  }

  /** Listens, or throws: an instance that cannot hear the others must not start. */
  async start(): Promise<void> {
    await this.#connect();
  }

  async stop(): Promise<void> {
    this.#stopped = true;
    clearTimeout(this.#retry);
    const current = this.#current;
    this.#current = undefined;
    await current?.close();
  }

  async #connect(): Promise<void> {
    const opened = await this.#open();
    const { client } = opened;
    let lost = false;
    const onLost = () => {
      if (lost) return;
      lost = true;
      this.#current = undefined;
      this.#processId = undefined;
      if (!this.#stopped) this.#reconnect(this.#initialRetryMs);
    };
    client.on('error', onLost);
    client.on('end', onLost);
    client.on('notification', ({ channel, payload }) => {
      if (channel !== GAME_EVENTS_CHANNEL || payload === undefined) return;
      try {
        const { playerIds, event } = readNotification(payload);
        this.#onEvents(playerIds, event);
      } catch (error) {
        console.error(error);
      }
    });
    await client.query(`SET application_name = '${LISTENER_APPLICATION_NAME}'`);
    await client.query(`LISTEN ${GAME_EVENTS_CHANNEL}`);
    const { rows } = await client.query<{ pid: number }>('select pg_backend_pid() as pid');
    this.#processId = rows[0]?.pid;
    this.#current = opened;
  }

  #reconnect(delayMs: number): void {
    this.#retry = setTimeout(() => {
      this.#connect().then(
        () => this.#onReconnected(),
        (error: unknown) => {
          console.error(error);
          if (!this.#stopped) this.#reconnect(Math.min(delayMs * 2, MAX_RETRY_MS));
        },
      );
    }, delayMs);
  }
}
