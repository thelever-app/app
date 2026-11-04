import { CONTRACT_VERSION } from '@thelever-app/protocol';
import { SEED_DILEMMAS } from '@thelever-app/dilemmas/seed';
import { afterEach, describe, expect, it } from 'vitest';
import { CloudLoggingLogger } from '../../telemetry/cloud-logging-logger.ts';
import { tokenOf } from '../support/fake-token-verifier.ts';
import { recordSpans } from '../support/recorded-spans.ts';
import { gameInDecisionPhase, startRoomServer, TestClient } from '../support/room-server.ts';

const spans = recordSpans();
const servers: Awaited<ReturnType<typeof startRoomServer>>[] = [];

afterEach(async () => {
  for (const server of servers.splice(0)) await server.stop();
});

/** A trace context as the web makes one per command. */
function traceparentOf(traceId: string, spanId: string): string {
  return `00-${traceId}-${spanId}-01`;
}

/** The room server, with a logger that keeps each entry as Cloud Logging would read it. */
async function tracedRoomServer() {
  const entries: Record<string, unknown>[] = [];
  const server = await startRoomServer({
    logger: new CloudLoggingLogger({
      projectId: 'thelever-app-test',
      write: (line) => {
        entries.push(JSON.parse(line) as Record<string, unknown>);
      },
    }),
  });
  servers.push(server);
  return { server, entries };
}

describe('a traced game', () => {
  it('should continue on the server the trace each command started on the device', async () => {
    // Arrange
    const { server } = await tracedRoomServer();
    const { gameId } = await gameInDecisionPhase(server.http);
    const connectTrace = '0af7651916cd43dd8448eb211c80319c';
    const answerTrace = '4bf92f3577b34da6a3ce929d0e0e4736';
    const ana = await TestClient.open(server.url);

    // Act
    ana.send({
      type: 'connect',
      contractVersion: CONTRACT_VERSION,
      token: tokenOf('ana'),
      gameId,
      language: 'es',
      traceparent: traceparentOf(connectTrace, 'b7ad6b7169203331'),
    });
    await ana.next('game-state');
    ana.send({
      type: 'answer-dilemma',
      dilemmaId: SEED_DILEMMAS[0]!.id,
      vote: SEED_DILEMMAS[0]!.options[0]!.id,
      traceparent: traceparentOf(answerTrace, '00f067aa0ba902b7'),
    });
    // The one who answers learns their progress from a fresh state.
    await ana.next('game-state');

    // Assert
    const connect = spans.finished().find(({ name }) => name === 'ws connect');
    const answer = spans.finished().find(({ name }) => name === 'ws answer-dilemma');
    expect(connect?.spanContext().traceId).toBe(connectTrace);
    expect(connect?.parentSpanContext?.spanId).toBe('b7ad6b7169203331');
    expect(answer?.spanContext().traceId).toBe(answerTrace);
    expect(answer?.attributes).toMatchObject({
      'game.id': gameId,
      'message.type': 'answer-dilemma',
    });
  });

  it('should tie what the server logs about a command to the trace the device started', async () => {
    // Arrange
    const { server, entries } = await tracedRoomServer();
    const { gameId } = await gameInDecisionPhase(server.http);
    const ana = await TestClient.connected(server.url, 'ana', gameId);
    const rejectedTrace = '5bf92f3577b34da6a3ce929d0e0e4736';

    // Act
    ana.send({
      type: 'answer-dilemma',
      dilemmaId: 'not-in-this-game',
      vote: 'option-1',
      traceparent: traceparentOf(rejectedTrace, '00f067aa0ba902b7'),
    });
    await ana.next('error');

    // Assert
    expect(entries).toContainEqual(
      expect.objectContaining({
        message: 'command rejected',
        'logging.googleapis.com/trace': `projects/thelever-app-test/traces/${rejectedTrace}`,
      }),
    );
  });
});
