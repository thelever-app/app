import type { Logger } from '@thelever-app/db';
import type { KeyedLock } from '../concurrency/keyed-lock.ts';
import type { RunCommand } from './run-command.ts';

/**
 * Runs out the total time of the games of the rooms this instance holds players of, when it ends.
 * Every instance with players of a room keeps its own timer, and running out twice does nothing, so
 * the first one wins. A timer lost with an instance does not matter: the next command or connection
 * of the room finds the time over.
 */
export class TotalTimeTimers {
  /** Runs out the total time of the game in progress in the room, if it is over. */
  readonly #runOutTotalTime: (roomId: string) => Promise<void>;
  readonly #roomLock: KeyedLock;
  readonly #runCommand: RunCommand;
  readonly #logger: Logger;
  /** One per room, with the moment it is set for. */
  readonly #timers = new Map<string, { readonly at: number; readonly timer: NodeJS.Timeout }>();

  constructor(
    runOutTotalTime: (roomId: string) => Promise<void>,
    roomLock: KeyedLock,
    runCommand: RunCommand,
    logger: Logger,
  ) {
    this.#runOutTotalTime = runOutTotalTime;
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

    const timer = setTimeout(() => void this.#runOut(roomId), Math.max(0, at - Date.now()));
    // A timer must not keep the instance alive once it is stopping.
    timer.unref();
    this.#timers.set(roomId, { at, timer });
  }

  /** Stops every timer, as the instance stops. */
  clear(): void {
    for (const { timer } of this.#timers.values()) clearTimeout(timer);
    this.#timers.clear();
  }

  /** Never throws: a failure is logged, and the next command of the room finds the time over. */
  async #runOut(roomId: string): Promise<void> {
    this.#timers.delete(roomId);
    try {
      const release = await this.#roomLock.acquire(roomId);
      try {
        await this.#runCommand(() => this.#runOutTotalTime(roomId));
      } finally {
        release();
      }
    } catch (error) {
      this.#logger.error('running out the total time failed', error, { roomId });
    }
  }
}
