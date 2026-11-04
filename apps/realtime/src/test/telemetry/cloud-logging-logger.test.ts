import { TraceFlags, type SpanContext } from '@opentelemetry/api';
import { describe, expect, it } from 'vitest';
import { CloudLoggingLogger } from '../../telemetry/cloud-logging-logger.ts';

/** A logger that keeps each line it writes, already parsed. */
function recordingLogger(spanContext: () => SpanContext | undefined = () => undefined) {
  const entries: Record<string, unknown>[] = [];
  const logger = new CloudLoggingLogger({
    projectId: 'thelever-app-test',
    write: (line) => {
      entries.push(JSON.parse(line) as Record<string, unknown>);
    },
    spanContext,
  });
  return { logger, entries };
}

describe('CloudLoggingLogger', () => {
  it('should write one JSON line with the severity and the message', () => {
    // Arrange
    const lines: string[] = [];
    const logger = new CloudLoggingLogger({
      projectId: 'thelever-app-test',
      write: (line) => lines.push(line),
      spanContext: () => undefined,
    });

    // Act
    logger.info('listening');

    // Assert
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain('\n');
    expect(JSON.parse(lines[0]!)).toEqual({ severity: 'INFO', message: 'listening' });
  });

  it('should write a warning with the severity Cloud Logging knows', () => {
    // Arrange
    const { logger, entries } = recordingLogger();

    // Act
    logger.warn('listen connection lost');

    // Assert
    expect(entries[0]).toMatchObject({ severity: 'WARNING' });
  });

  it('should keep the fields next to the message', () => {
    // Arrange
    const { logger, entries } = recordingLogger();

    // Act
    logger.info('listening', { port: 8080, revision: 'realtime-00012-xsq' });

    // Assert
    expect(entries[0]).toEqual({
      severity: 'INFO',
      message: 'listening',
      port: 8080,
      revision: 'realtime-00012-xsq',
    });
  });

  it('should not let a field replace the severity or the message', () => {
    // Arrange
    const { logger, entries } = recordingLogger();

    // Act
    logger.info('listening', { severity: 'ERROR', message: 'other' });

    // Assert
    expect(entries[0]).toMatchObject({ severity: 'INFO', message: 'listening' });
  });

  it('should write the stack of an error, so Error Reporting groups it', () => {
    // Arrange
    const { logger, entries } = recordingLogger();
    const error = new Error('connection terminated');

    // Act
    logger.error('pool connection failed', error, { pool: 'game' });

    // Assert
    expect(entries[0]).toEqual({
      severity: 'ERROR',
      message: 'pool connection failed',
      stack_trace: error.stack,
      pool: 'game',
    });
  });

  it('should write a thrown value that is not an error as text', () => {
    // Arrange
    const { logger, entries } = recordingLogger();

    // Act
    logger.error('tick failed', 'timeout');

    // Assert
    expect(entries[0]).toEqual({ severity: 'ERROR', message: 'tick failed', error: 'timeout' });
  });

  it('should write an error entry without a cause when there is none', () => {
    // Arrange
    const { logger, entries } = recordingLogger();

    // Act
    logger.error('instance left with connections still open');

    // Assert
    expect(entries[0]).toEqual({
      severity: 'ERROR',
      message: 'instance left with connections still open',
    });
  });

  it('should tie the entry to the active span, so Cloud Logging shows it with its trace', () => {
    // Arrange
    const { logger, entries } = recordingLogger(() => ({
      traceId: '0af7651916cd43dd8448eb211c80319c',
      spanId: 'b7ad6b7169203331',
      traceFlags: TraceFlags.SAMPLED,
    }));

    // Act
    logger.info('listening');

    // Assert
    expect(entries[0]).toMatchObject({
      'logging.googleapis.com/trace':
        'projects/thelever-app-test/traces/0af7651916cd43dd8448eb211c80319c',
      'logging.googleapis.com/spanId': 'b7ad6b7169203331',
      'logging.googleapis.com/trace_sampled': true,
    });
  });

  it('should say when the trace of the entry was not kept', () => {
    // Arrange
    const { logger, entries } = recordingLogger(() => ({
      traceId: '0af7651916cd43dd8448eb211c80319c',
      spanId: 'b7ad6b7169203331',
      traceFlags: TraceFlags.NONE,
    }));

    // Act
    logger.info('listening');

    // Assert
    expect(entries[0]).toMatchObject({ 'logging.googleapis.com/trace_sampled': false });
  });

  it('should leave the trace out when the span is not valid', () => {
    // Arrange
    const { logger, entries } = recordingLogger(() => ({
      traceId: '00000000000000000000000000000000',
      spanId: '0000000000000000',
      traceFlags: TraceFlags.NONE,
    }));

    // Act
    logger.info('listening');

    // Assert
    expect(entries[0]).toEqual({ severity: 'INFO', message: 'listening' });
  });
});
