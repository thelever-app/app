import type { Clock } from '@thelever-app/game';
import type { Logger } from '@thelever-app/db';
import type { KeyedLock } from '../concurrency/keyed-lock.ts';
import type { RunCommand } from './run-command.ts';

/**
 * Runs out the time for the dilemma of the round of each room this instance holds players of, when
 * it ends. Every instance with players of a room keeps its own timer, and running out twice does
 * nothing, so the first one wins. A timer lost with an instance does not matter: the next command
 * or connection of the room finds the time over.
 */
export class RoundTimers {
  /** Runs out the time for the dilemma of the round in progress in the room, if it is over. */
  readonly #runOutRound: (roomId: string) => Promise<void>;
  readonly #clock: Clock;
  readonly #roomLock: KeyedLock;
  readonly #runCommand: RunCommand;
  readonly #logger: Logger;
  /** One per room, with the moment it is set for. */
  readonly #timers = new Map<string, { readonly at: number; readonly timer: NodeJS.Timeout }>();

  constructor(
    runOutRound: (roomId: string) => Promise<void>,
    clock: Clock,
    roomLock: KeyedLock,
    runCommand: RunCommand,
    logger: Logger,
  ) {
    this.#runOutRound = runOutRound;
    this.#clock = clock;
    this.#roomLock = roomLock;
    this.#runCommand = runCommand;
    this.#logger = logger;
  }

  /** At that moment, or at once if it is past; setting the same moment again changes nothing. */
  schedule(roomId: string, endsAt: Date): void {
    const at = endsAt.getTime();
    const scheduled = this.#timers.get(roomId);
    if (scheduled?.at === at) return;
    if (scheduled) clearTimeout(scheduled.timer);
    this.#set(roomId, at);
  }

  /** Stops every timer, as the instance stops. */
  clear(): void {
    for (const { timer } of this.#timers.values()) clearTimeout(timer);
    this.#timers.clear();
  }

  #set(roomId: string, at: number): void {
    const timer = setTimeout(
      () => void this.#runOut(roomId, at),
      Math.max(0, at - this.#clock.now().getTime()),
    );
    // A timer must not keep the instance alive once it is stopping.
    timer.unref();
    this.#timers.set(roomId, { at, timer });
  }

  /**
   * Never throws: a failure is logged, and the next command of the room finds the time over. A timer
   * of Node may fire a little before its moment by the clock: then it waits again, or the game would
   * find the time not over yet and nobody would run it out.
   */
  async #runOut(roomId: string, at: number): Promise<void> {
    if (this.#clock.now().getTime() < at) {
      this.#set(roomId, at);
      return;
    }
    this.#timers.delete(roomId);
    try {
      const release = await this.#roomLock.acquire(roomId);
      try {
        await this.#runCommand(() => this.#runOutRound(roomId));
      } finally {
        release();
      }
    } catch (error) {
      this.#logger.error('running out the time for the dilemma failed', error, { roomId });
    }
  }
}
