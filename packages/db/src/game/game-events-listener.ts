import { context, propagation, ROOT_CONTEXT } from '@opentelemetry/api';
import type { DomainEvent } from '@thelever-app/game';
import type pg from 'pg';
import type { Logger } from '../logger.ts';
import { GAME_EVENTS_CHANNEL, readNotification } from './postgres-player-notifier.ts';

const MAX_RETRY_MS = 30_000;

/** How the listening connection shows up in pg_stat_activity. */
export const LISTENER_APPLICATION_NAME = 'game_events_listener';

/** What an instance does with each event it hears: deliver it to those of its players. */
type OnEvents = (
  playerIds: readonly string[],
  event: DomainEvent,
  /** When it was published, in milliseconds since the epoch, if the publisher said. */
  publishedAt: number | undefined,
) => void;

interface Opened {
  readonly client: pg.Client;
  readonly close: () => Promise<void>;
}

/**
 * Listens to the events every instance publishes, on a connection of its own (ADR 0003). If the
 * connection is lost, or stops answering, it closes it and connects again, waiting longer each
 * time, and says so: whatever was published meanwhile is lost, and only a fresh state makes up for it.
 */
export class GameEventsListener {
  readonly #open: () => Promise<Opened>;
  readonly #onEvents: OnEvents;
  readonly #onReconnected: () => void;
  readonly #logger: Logger;
  readonly #initialRetryMs: number;
  /** How often it checks that the connection still answers: a network cut may never end it. */
  readonly #probeEveryMs: number;
  readonly #probeTimeoutMs: number;
  /** The connection it listens on; none while it connects. */
  #current: Opened | undefined;
  #processId: number | undefined;
  #retry: ReturnType<typeof setTimeout> | undefined;
  #probe: ReturnType<typeof setTimeout> | undefined;
  #stopped = false;

  constructor(
    open: () => Promise<Opened>,
    {
      onEvents,
      onReconnected = () => {},
      logger,
      initialRetryMs = 500,
      probeEveryMs = 30_000,
      probeTimeoutMs = 10_000,
    }: {
      readonly onEvents: OnEvents;
      readonly onReconnected?: () => void;
      readonly logger: Logger;
      readonly initialRetryMs?: number;
      readonly probeEveryMs?: number;
      readonly probeTimeoutMs?: number;
    },
  ) {
    this.#open = open;
    this.#onEvents = onEvents;
    this.#onReconnected = onReconnected;
    this.#logger = logger;
    this.#initialRetryMs = initialRetryMs;
    this.#probeEveryMs = probeEveryMs;
    this.#probeTimeoutMs = probeTimeoutMs;
  }

  /** The server process of the listening connection, while there is one. */
  get processId(): number | undefined {
    return this.#processId;
  }

  /** Listens, or throws: an instance that cannot hear the others must not start. */
  async start(): Promise<void> {
    await this.#connect();
    this.#scheduleProbe();
  }

  async stop(): Promise<void> {
    this.#stopped = true;
    clearTimeout(this.#retry);
    clearTimeout(this.#probe);
    const current = this.#current;
    this.#current = undefined;
    this.#processId = undefined;
    await current?.close();
  }

  /** Opens a connection and listens on it; if that fails, closes it and throws. */
  async #connect(): Promise<void> {
    const opened = await this.#open();
    const { client } = opened;
    const onLost = () => this.#lost(opened);
    client.on('error', onLost);
    client.on('end', onLost);
    client.on('notification', ({ channel, payload }) => {
      if (channel !== GAME_EVENTS_CHANNEL || payload === undefined) return;
      try {
        const { playerIds, event, trace, publishedAt } = readNotification(payload);
        // Delivering continues the trace of the command that published, on whichever instance.
        context.with(propagation.extract(ROOT_CONTEXT, trace), () =>
          this.#onEvents(playerIds, event, publishedAt),
        );
      } catch (error) {
        this.#logger.error('unreadable game event notification', error);
      }
    });
    let processId: number | undefined;
    try {
      await client.query(`SET application_name = '${LISTENER_APPLICATION_NAME}'`);
      await client.query(`LISTEN ${GAME_EVENTS_CHANNEL}`);
      const { rows } = await client.query<{ pid: number }>('select pg_backend_pid() as pid');
      processId = rows[0]?.pid;
    } catch (error) {
      await opened.close().catch((error: unknown) => {
        this.#logger.error('closing a listen connection that failed to listen failed', error);
      });
      throw error;
    }
    if (this.#stopped) {
      await opened.close();
      return;
    }
    this.#processId = processId;
    this.#current = opened;
  }

  /**
   * Only the connection it listens on is lost here: until it listens, a loss makes `#connect` fail,
   * and whoever called it decides. Each loss starts one new attempt, never two.
   */
  #lost(opened: Opened): void {
    if (this.#current !== opened) return;
    this.#current = undefined;
    this.#processId = undefined;
    this.#logger.warn('listen connection lost');
    opened.close().catch((error: unknown) => {
      this.#logger.error('closing a lost listen connection failed', error);
    });
    if (!this.#stopped) this.#reconnect(this.#initialRetryMs);
  }

  #reconnect(delayMs: number): void {
    this.#retry = setTimeout(() => {
      this.#connect().then(
        () => {
          if (!this.#stopped) this.#onReconnected();
        },
        (error: unknown) => {
          const nextDelayMs = Math.min(delayMs * 2, MAX_RETRY_MS);
          this.#logger.error('listening again failed', error, { retryInMs: nextDelayMs });
          if (!this.#stopped) this.#reconnect(nextDelayMs);
        },
      );
    }, delayMs);
  }

  #scheduleProbe(): void {
    this.#probe = setTimeout(() => {
      this.#check().then(
        () => {
          if (!this.#stopped) this.#scheduleProbe();
        },
        (error: unknown) => {
          this.#logger.error('checking the listen connection failed', error);
        },
      );
    }, this.#probeEveryMs);
  }

  /** Takes the connection for lost if it does not answer in time. */
  async #check(): Promise<void> {
    const opened = this.#current;
    if (!opened) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const answered = await Promise.race([
      opened.client.query('select 1').then(
        () => true,
        () => false,
      ),
      new Promise<false>((resolve) => {
        timeout = setTimeout(() => resolve(false), this.#probeTimeoutMs);
      }),
    ]);
    clearTimeout(timeout);
    if (!answered) this.#lost(opened);
  }
}
