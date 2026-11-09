import type { Clock } from '@thelever-app/game';

/** The clock of the machine, which Cloud Run keeps in time. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
