import {
  type Attributes,
  type Context,
  isSpanContextValid,
  type SpanKind,
  trace,
  TraceFlags,
} from '@opentelemetry/api';
import {
  type Sampler,
  SamplingDecision,
  type SamplingResult,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace';

/** The attribute that ties a span to its game, to find it; sampling goes by the room. */
export const GAME_ID = 'game.id';

/** The attribute that ties a span to its room, which decides whether it is kept. */
export const ROOM_ID = 'room.id';

/**
 * Keeps a whole room or none of it: decides by the room, not by the trace, so every command of a
 * kept room, from the lobby to the end of its games, can be followed from start to end. A span of
 * no room follows its parent from another process, which was decided by its room, or else is
 * decided by its trace.
 */
export class GameSampler implements Sampler {
  readonly #ratio: number;
  readonly #byTrace: TraceIdRatioBasedSampler;

  constructor(ratio: number) {
    this.#ratio = ratio;
    this.#byTrace = new TraceIdRatioBasedSampler(ratio);
  }

  shouldSample(
    context: Context,
    traceId: string,
    _spanName: string,
    _spanKind: SpanKind,
    attributes: Attributes,
  ): SamplingResult {
    const roomId = attributes[ROOM_ID];
    if (typeof roomId !== 'string') {
      const parent = trace.getSpanContext(context);
      if (parent?.isRemote && isSpanContextValid(parent)) {
        return {
          decision:
            (parent.traceFlags & TraceFlags.SAMPLED) !== 0
              ? SamplingDecision.RECORD_AND_SAMPLED
              : SamplingDecision.NOT_RECORD,
        };
      }
      return this.#byTrace.shouldSample(context, traceId);
    }
    return {
      decision:
        fractionOf(roomId) < this.#ratio
          ? SamplingDecision.RECORD_AND_SAMPLED
          : SamplingDecision.NOT_RECORD,
    };
  }

  toString(): string {
    return `GameSampler{${this.#ratio}}`;
  }
}

/** Where the room falls in [0, 1): FNV-1a, always the same for the same id. */
function fractionOf(id: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash / 2 ** 32;
}
