import { SpanStatusCode, trace } from '@opentelemetry/api';
import { describe, expect, it } from 'vitest';
import { inSpan } from '../../telemetry/tracing.ts';
import { recordSpans } from '../support/recorded-spans.ts';

const spans = recordSpans();

describe('inSpan', () => {
  it('should run the work in a span with that name and attributes, and end it', async () => {
    // Arrange
    let activeInside: string | undefined;

    // Act
    const result = await inSpan('ws answer-dilemma', { 'game.id': 'TestGameId' }, async () => {
      activeInside = trace.getActiveSpan()?.spanContext().spanId;
      return 'answered';
    });

    // Assert
    const [span] = spans.finished();
    expect(result).toBe('answered');
    expect(span?.name).toBe('ws answer-dilemma');
    expect(span?.attributes).toEqual({ 'game.id': 'TestGameId' });
    expect(activeInside).toBe(span?.spanContext().spanId);
  });

  it('should keep in the span what the work throws, and throw it again', async () => {
    // Arrange
    const error = new Error('connection terminated');

    // Act
    const running = inSpan('ws connect', {}, async () => {
      throw error;
    });

    // Assert
    await expect(running).rejects.toBe(error);
    const [span] = spans.finished();
    expect(span?.status).toEqual({ code: SpanStatusCode.ERROR, message: 'connection terminated' });
    expect(span?.events.map(({ name }) => name)).toEqual(['exception']);
  });
});
