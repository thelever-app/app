import { afterEach, describe, expect, it } from 'vitest';
import { CloudLoggingLogger } from '../../telemetry/cloud-logging-logger.ts';
import { recordMetrics } from '../support/recorded-metrics.ts';
import { gameInDecisionPhase, startRoomServer, TestClient } from '../support/room-server.ts';

const recorded = recordMetrics();
const servers: Awaited<ReturnType<typeof startRoomServer>>[] = [];

afterEach(async () => {
  for (const server of servers.splice(0)) await server.stop();
});

async function roomServer() {
  const server = await startRoomServer();
  servers.push(server);
  return server;
}

async function until(condition: () => Promise<boolean>, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!(await condition())) {
    if (Date.now() > deadline) throw new Error('it never happened');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe('the metrics of the room server', () => {
  it('should count the sockets open on the instance', async () => {
    // Arrange
    const server = await roomServer();
    const ana = await TestClient.open(server.url);
    await TestClient.open(server.url);

    // Act
    ana.socket.close();
    await ana.closed();

    // Assert
    await until(async () => (await recorded.pointsOf('thelever.ws.connections'))[0]?.value === 1);
  });

  it('should time each message by its type and outcome', async () => {
    // Arrange
    const server = await roomServer();
    const { roomId } = await gameInDecisionPhase(server);
    const ana = await TestClient.connected(server.url, 'ana', roomId);

    // Act
    ana.send({ type: 'answer-dilemma', dilemmaId: 'not-in-this-game', vote: 'option-1' });
    await ana.next('error');

    // Assert
    const points = await recorded.pointsOf('thelever.ws.message.duration');
    expect(points.map(({ attributes }) => attributes)).toEqual(
      expect.arrayContaining([
        { 'message.type': 'connect', outcome: 'ok' },
        { 'message.type': 'answer-dilemma', outcome: 'rejected' },
      ]),
    );
  });

  it('should count the errors logged, by their message', async () => {
    // Arrange
    const logger = new CloudLoggingLogger({ projectId: 'thelever-app-test', write: () => {} });

    // Act
    logger.error('delivering a game event failed', new Error('socket closed'));
    logger.error('delivering a game event failed', new Error('socket closed'));
    logger.warn('listen connection lost');

    // Assert
    const points = await recorded.pointsOf('thelever.errors');
    expect(points.map(({ attributes, value }) => ({ attributes, value }))).toEqual([
      { attributes: { message: 'delivering a game event failed' }, value: 2 },
    ]);
  });
});
