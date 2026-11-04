import { isSpanContextValid, trace, TraceFlags, type SpanContext } from '@opentelemetry/api';
import type { LogFields, Logger } from '@thelever-app/db';
import { instruments } from './instruments.ts';

type Severity = 'INFO' | 'WARNING' | 'ERROR';

/**
 * Writes each entry as one JSON line with the fields Cloud Logging reads: Cloud Run takes stdout,
 * keeps `severity` and `message`, shows the entry with the trace of the span it was written in,
 * and Error Reporting groups the entries with a `stack_trace`.
 */
export class CloudLoggingLogger implements Logger {
  /** The Google Cloud project the traces live in. */
  readonly #projectId: string;
  readonly #write: (line: string) => void;
  readonly #spanContext: () => SpanContext | undefined;

  constructor({
    projectId,
    write = (line) => process.stdout.write(`${line}\n`),
    spanContext = () => trace.getActiveSpan()?.spanContext(),
  }: {
    readonly projectId: string;
    readonly write?: (line: string) => void;
    readonly spanContext?: () => SpanContext | undefined;
  }) {
    this.#projectId = projectId;
    this.#write = write;
    this.#spanContext = spanContext;
  }

  info(message: string, fields?: LogFields): void {
    this.#log('INFO', message, fields);
  }

  warn(message: string, fields?: LogFields): void {
    this.#log('WARNING', message, fields);
  }

  /** Each message is a fixed text, so it is also how the errors are counted. */
  error(message: string, error?: unknown, fields?: LogFields): void {
    this.#log('ERROR', message, { ...fields, ...causeOf(error) });
    instruments().errors.add(1, { message });
  }

  #log(severity: Severity, message: string, fields?: LogFields): void {
    this.#write(JSON.stringify({ ...fields, ...this.#traceFields(), severity, message }));
  }

  #traceFields(): LogFields {
    const span = this.#spanContext();
    if (!span || !isSpanContextValid(span)) return {};
    return {
      'logging.googleapis.com/trace': `projects/${this.#projectId}/traces/${span.traceId}`,
      'logging.googleapis.com/spanId': span.spanId,
      'logging.googleapis.com/trace_sampled': (span.traceFlags & TraceFlags.SAMPLED) !== 0,
    };
  }
}

/** What was thrown, as Error Reporting reads it: the stack of an error, or the value as text. */
function causeOf(error: unknown): LogFields {
  if (error === undefined) return {};
  if (error instanceof Error && error.stack) return { stack_trace: error.stack };
  return { error: String(error) };
}
