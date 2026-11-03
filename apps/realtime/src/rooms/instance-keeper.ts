import type { PostgresInstances } from '@thelever-app/db';
import type { DisconnectConnectionsUseCase } from '@thelever-app/game';
import type { RunCommand } from './run-command.ts';

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
    }: {
      readonly instanceId: string;
      readonly beatEveryMs: number;
      readonly silentAfterMs: number;
      readonly onForgotten: () => void;
    },
  ) {
    this.#instances = instances;
    this.#disconnectConnections = disconnectConnections;
    this.#runCommand = runCommand;
    this.#instanceId = instanceId;
    this.#beatEveryMs = beatEveryMs;
    this.#silentAfterMs = silentAfterMs;
    this.#onForgotten = onForgotten;
  }

  /** Registers the instance before it serves anyone, and starts giving signs. */
  async start(): Promise<void> {
    await this.#instances.beat(this.#instanceId);
    this.#timer = setInterval(() => {
      this.#tick().catch(console.error);
    }, this.#beatEveryMs);
  }

  stop(): void {
    clearInterval(this.#timer);
  }

  /** For an instance that leaves: closes its own connections and forgets it. */
  async leave(): Promise<void> {
    this.stop();
    for (let attempt = 1; ; attempt += 1) {
      await this.#closeConnectionsOf(this.#instanceId);
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
    const silent = await this.#instances.findSilent({
      forMs: this.#silentAfterMs,
      except: this.#instanceId,
    });
    for (const instanceId of silent) {
      // Another instance may clean the same one at once: the lock of each room puts them in order.
      // If it still has connections, it was not dead after all, or it is cleaned on the next look.
      await this.#closeConnectionsOf(instanceId);
      await this.#instances.remove(instanceId);
    }
  }

  async #closeConnectionsOf(instanceId: string): Promise<void> {
    for (const room of await this.#instances.connectionsOf(instanceId)) {
      await this.#runCommand(() => this.#disconnectConnections.execute(room));
    }
  }
}
