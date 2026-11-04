import { context, propagation, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import {
  InMemorySpanExporter,
  type ReadableSpan,
  SimpleSpanProcessor,
  TracerProvider,
} from '@opentelemetry/sdk-trace';
import { afterAll, afterEach, beforeAll } from 'vitest';

/**
 * Records every span the tests of a file create, as the SDK does on Cloud Run but in memory: a
 * context that follows async calls, W3C trace headers and every span kept.
 */
export function recordSpans(): { readonly finished: () => readonly ReadableSpan[] } {
  const exporter = new InMemorySpanExporter();

  beforeAll(() => {
    context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());
    trace.setGlobalTracerProvider(
      new TracerProvider({ spanProcessors: [new SimpleSpanProcessor({ exporter })] }),
    );
  });

  afterEach(() => exporter.reset());

  afterAll(() => {
    trace.disable();
    propagation.disable();
    context.disable();
  });

  return { finished: () => exporter.getFinishedSpans() };
}
