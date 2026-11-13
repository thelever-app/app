import type { Logger, PostgresInstances } from '@thelever-app/db';
import type { DisconnectConnectionsUseCase } from '@thelever-app/game';
import type { RunCommand } from './run-command.ts';
import { closeConnectionsOf, forgetSilentInstances } from './silent-instances.ts';

/** A command already running when the instance leaves may save one more connection after it looked. */
const LEAVE_ATTEMPTS = 5;
const LEAVE_RETRY_MS = 200;

/**
 * Keeps this instance seen alive and closes the connections of the instances that died without
 * saying so, room by room, so their players are not seen connected forever.
 */
export class InstanceKeeper {
  readonly #instances: PostgresInstances;
  readonly #disconnectConnections: DisconnectConnectionsUseCase;
  readonly #runCommand: RunCommand;
  readonly #instanceId: string;
  /** How often this instance gives a sign and looks for silent ones. */
  readonly #beatEveryMs: number;
  /** How long without a sign before an instance is taken for dead. */
  readonly #silentAfterMs: number;
  /** For when the others took this instance for dead, alive: its connections are closed for everyone. */
  readonly #onForgotten: () => void;
  readonly #logger: Logger;
  #timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    instances: PostgresInstances,
    disconnectConnections: DisconnectConnectionsUseCase,
    runCommand: RunCommand,
    {
      instanceId,
      beatEveryMs,
      silentAfterMs,
      onForgotten,
      logger,
    }: {
      readonly instanceId: string;
      readonly beatEveryMs: number;
      readonly silentAfterMs: number;
      readonly onForgotten: () => void;
      readonly logger: Logger;
    },
  ) {
    this.#instances = instances;
    this.#disconnectConnections = disconnectConnections;
    this.#runCommand = runCommand;
    this.#instanceId = instanceId;
    this.#beatEveryMs = beatEveryMs;
    this.#silentAfterMs = silentAfterMs;
    this.#onForgotten = onForgotten;
    this.#logger = logger;
  }

  /** Registers the instance before it serves anyone, and starts giving signs. */
  async start(): Promise<void> {
    await this.#instances.beat(this.#instanceId);
    this.#timer = setInterval(() => {
      this.#tick().catch((error: unknown) => {
        this.#logger.error('instance beat failed', error);
      });
    }, this.#beatEveryMs);
  }

  stop(): void {
    clearInterval(this.#timer);
  }

  /** For an instance that leaves: closes its own connections and forgets it. */
  async leave(): Promise<void> {
    this.stop();
    for (let attempt = 1; ; attempt += 1) {
      await closeConnectionsOf(this.#cleaning, this.#instanceId, new Date());
      if (await this.#instances.remove(this.#instanceId)) return;
      if (attempt === LEAVE_ATTEMPTS) {
        throw new Error(`instance ${this.#instanceId} left with connections still open`);
      }
      await new Promise((resolve) => setTimeout(resolve, LEAVE_RETRY_MS));
    }
  }

  async #tick(): Promise<void> {
    // Its sign registers it again, so its players can connect again as soon as it says so.
    if (!(await this.#instances.beat(this.#instanceId))) this.#onForgotten();
    await forgetSilentInstances(this.#cleaning, {
      silentAfterMs: this.#silentAfterMs,
      except: this.#instanceId,
    });
  }

  get #cleaning() {
    return {
      instances: this.#instances,
      disconnectConnections: this.#disconnectConnections,
      runCommand: this.#runCommand,
    };
  }
}
