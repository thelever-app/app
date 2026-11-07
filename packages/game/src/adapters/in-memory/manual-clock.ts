import type { Clock } from '../../domain/ports/clock.port.ts';

/** A clock that only moves when told, so tests and the simulated room say what time it is. */
export class ManualClock implements Clock {
  #now: Date;

  constructor(start = new Date('2026-11-09T10:00:00Z')) {
    this.#now = new Date(start);
  }

  now(): Date {
    return new Date(this.#now);
  }

  advance(ms: number): void {
    this.#now = new Date(this.#now.getTime() + ms);
  }
}
