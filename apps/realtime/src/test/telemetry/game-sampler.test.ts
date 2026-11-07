import { ROOT_CONTEXT, SpanKind, trace, TraceFlags, type Attributes } from '@opentelemetry/api';
import { SamplingDecision } from '@opentelemetry/sdk-trace';
import { describe, expect, it } from 'vitest';
import { GameSampler } from '../../telemetry/game-sampler.ts';

const SOME_TRACE = '0af7651916cd43dd8448eb211c80319c';
const OTHER_TRACE = 'f1e2d3c4b5a697887766554433221100';

function decisionOf(
  sampler: GameSampler,
  attributes: Attributes,
  traceId = SOME_TRACE,
  parent = ROOT_CONTEXT,
) {
  return sampler.shouldSample(parent, traceId, 'ws answer-dilemma', SpanKind.SERVER, attributes)
    .decision;
}

/** A context whose parent came from another process, such as the instance that published. */
function remoteParent(traceFlags: TraceFlags) {
  return trace.setSpanContext(ROOT_CONTEXT, {
    traceId: SOME_TRACE,
    spanId: 'b7ad6b7169203331',
    traceFlags,
    isRemote: true,
  });
}

describe('GameSampler', () => {
  it('should keep every room with a ratio of 1', () => {
    // Arrange
    const sampler = new GameSampler(1);

    // Act
    const decision = decisionOf(sampler, { 'room.id': 'TestRoomId' });

    // Assert
    expect(decision).toBe(SamplingDecision.RECORD_AND_SAMPLED);
  });

  it('should drop every room with a ratio of 0', () => {
    // Arrange
    const sampler = new GameSampler(0);

    // Act
    const decision = decisionOf(sampler, { 'room.id': 'TestRoomId' });

    // Assert
    expect(decision).toBe(SamplingDecision.NOT_RECORD);
  });

  it('should decide the same for every trace of one room, so a room is kept whole or not at all', () => {
    // Arrange
    const sampler = new GameSampler(0.5);
    const roomIds = Array.from({ length: 50 }, (_, index) => `TestRoom${index}`);

    // Act
    const first = roomIds.map((roomId) => decisionOf(sampler, { 'room.id': roomId }, SOME_TRACE));
    const second = roomIds.map((roomId) => decisionOf(sampler, { 'room.id': roomId }, OTHER_TRACE));

    // Assert
    expect(second).toEqual(first);
  });

  it('should keep about the ratio of the rooms', () => {
    // Arrange
    const sampler = new GameSampler(0.25);
    const roomIds = Array.from({ length: 2000 }, () => crypto.randomUUID());

    // Act
    const kept = roomIds.filter(
      (roomId) =>
        decisionOf(sampler, { 'room.id': roomId }) === SamplingDecision.RECORD_AND_SAMPLED,
    ).length;

    // Assert
    expect(kept / roomIds.length).toBeGreaterThan(0.2);
    expect(kept / roomIds.length).toBeLessThan(0.3);
  });

  it('should decide by the trace when the span belongs to no room', () => {
    // Arrange
    const keepAll = new GameSampler(1);
    const keepNone = new GameSampler(0);

    // Act
    const kept = decisionOf(keepAll, { 'http.route': '/rooms' });
    const dropped = decisionOf(keepNone, { 'http.route': '/rooms' });

    // Assert
    expect(kept).toBe(SamplingDecision.RECORD_AND_SAMPLED);
    expect(dropped).toBe(SamplingDecision.NOT_RECORD);
  });

  it('should follow the parent from another process when the span belongs to no room', () => {
    // Arrange: the instance that published decided by the room; the delivery of a game event has none.
    const keepNone = new GameSampler(0);
    const keepAll = new GameSampler(1);
    const game = { 'game.id': 'TestGameId' };

    // Act
    const kept = decisionOf(keepNone, game, SOME_TRACE, remoteParent(TraceFlags.SAMPLED));
    const dropped = decisionOf(keepAll, game, SOME_TRACE, remoteParent(TraceFlags.NONE));

    // Assert
    expect(kept).toBe(SamplingDecision.RECORD_AND_SAMPLED);
    expect(dropped).toBe(SamplingDecision.NOT_RECORD);
  });
});
