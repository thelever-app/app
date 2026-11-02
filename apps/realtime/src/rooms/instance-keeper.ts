import type { PostgresInstances } from '@thelever-app/db';
import type { DisconnectConnectionsUseCase } from '@thelever-app/game';
import type { RunCommand } from './run-command.ts';

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
  #timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    instances: PostgresInstances,
    disconnectConnections: DisconnectConnectionsUseCase,
    runCommand: RunCommand,
    {
      instanceId,
      beatEveryMs,
      silentAfterMs,
    }: {
      readonly instanceId: string;
      readonly beatEveryMs: number;
      readonly silentAfterMs: number;
    },
  ) {
    this.#instances = instances;
    this.#disconnectConnections = disconnectConnections;
    this.#runCommand = runCommand;
    this.#instanceId = instanceId;
    this.#beatEveryMs = beatEveryMs;
    this.#silentAfterMs = silentAfterMs;
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
    await this.#closeConnectionsOf(this.#instanceId);
    await this.#instances.remove(this.#instanceId);
  }

  async #tick(): Promise<void> {
    await this.#instances.beat(this.#instanceId);
    const silent = await this.#instances.findSilent({
      forMs: this.#silentAfterMs,
      except: this.#instanceId,
    });
    for (const instanceId of silent) {
      // Another instance may clean the same one at once: the lock of each room puts them in order.
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
