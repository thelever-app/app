import {
  type Attributes,
  type Context,
  context,
  SpanKind,
  SpanStatusCode,
  type Span,
  trace,
} from '@opentelemetry/api';

/** The spans the room server makes by hand: no instrumentation sees WebSocket messages. */
const tracer = trace.getTracer('realtime');

/**
 * Runs the work in a span of its own, active while it runs, and ends it however the work ends:
 * what it throws stays in the span and is thrown again. The attributes are known at the start,
 * so the sampler sees the game.
 */
export async function inSpan<T>(
  name: string,
  attributes: Attributes,
  work: (span: Span) => Promise<T>,
  {
    kind = SpanKind.SERVER,
    parent = context.active(),
  }: {
    readonly kind?: SpanKind;
    /** The trace it continues, such as one a client or another instance started. */
    readonly parent?: Context;
  } = {},
): Promise<T> {
  return tracer.startActiveSpan(name, { kind, attributes }, parent, async (span) => {
    try {
      return await work(span);
    } catch (error) {
      markFailed(span, error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/** Keeps in the span what went wrong, for work that handles its own errors. */
export function markFailed(span: Span, error: unknown): void {
  span.recordException(error instanceof Error ? error : String(error));
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error instanceof Error ? error.message : String(error),
  });
}
