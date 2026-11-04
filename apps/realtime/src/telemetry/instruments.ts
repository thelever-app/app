import { type Counter, type Histogram, metrics, type UpDownCounter } from '@opentelemetry/api';

/** The metrics of the room server: few labels, never an id, so the series stay few (ADR 0005). */
export interface Instruments {
  /** Sockets open on this instance. */
  readonly openSockets: UpDownCounter;
  /** How long a message takes to be handled, by `message.type` and `outcome`. */
  readonly messageDuration: Histogram;
  /** From an event being published to its delivery on each instance, by `event.type`. */
  readonly eventDelay: Histogram;
  /** Errors logged, by their message, which is always a fixed text. */
  readonly errors: Counter;
}

/** Up to 2.5 s, finer below half a second. */
const MILLISECONDS = { explicitBucketBoundaries: [5, 10, 25, 50, 100, 200, 300, 500, 1000, 2500] };

let created: Instruments | undefined;

/**
 * Created on first use, after the SDK has its meter provider (it starts before the server loads):
 * a meter taken earlier would measure nothing, forever.
 */
export function instruments(): Instruments {
  if (created) return created;
  const meter = metrics.getMeter('realtime');
  created = {
    openSockets: meter.createUpDownCounter('thelever.ws.connections', {
      description: 'Sockets open on this instance',
    }),
    messageDuration: meter.createHistogram('thelever.ws.message.duration', {
      description: 'How long a message from a player takes to be handled',
      unit: 'ms',
      advice: MILLISECONDS,
    }),
    eventDelay: meter.createHistogram('thelever.game.event.delay', {
      description: 'From an event being published to its delivery on an instance',
      unit: 'ms',
      advice: MILLISECONDS,
    }),
    errors: meter.createCounter('thelever.errors', { description: 'Errors logged' }),
  };
  return created;
}
