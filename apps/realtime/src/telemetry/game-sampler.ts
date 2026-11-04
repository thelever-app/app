import type { Attributes, Context, SpanKind } from '@opentelemetry/api';
import {
  type Sampler,
  SamplingDecision,
  type SamplingResult,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace';

/** The attribute that ties a span to its game. */
export const GAME_ID = 'game.id';

/**
 * Keeps a whole game or none of it: decides by the game, not by the trace, so every command of a
 * kept game can be followed from start to end. A span of no game is decided by its trace.
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
    const gameId = attributes[GAME_ID];
    if (typeof gameId !== 'string') {
      return this.#byTrace.shouldSample(context, traceId);
    }
    return {
      decision:
        fractionOf(gameId) < this.#ratio
          ? SamplingDecision.RECORD_AND_SAMPLED
          : SamplingDecision.NOT_RECORD,
    };
  }

  toString(): string {
    return `GameSampler{${this.#ratio}}`;
  }
}

/** Where the game falls in [0, 1): FNV-1a, always the same for the same id. */
function fractionOf(gameId: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < gameId.length; index += 1) {
    hash ^= gameId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash / 2 ** 32;
}
