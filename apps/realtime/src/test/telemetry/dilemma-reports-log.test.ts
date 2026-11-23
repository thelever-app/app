import { afterEach, describe, expect, it } from 'vitest';
import { CloudLoggingLogger } from '../../telemetry/cloud-logging-logger.ts';
import { gameInDecisionPhase, startRoomServer, TestClient } from '../support/room-server.ts';

const servers: Awaited<ReturnType<typeof startRoomServer>>[] = [];

afterEach(async () => {
  for (const server of servers.splice(0)) await server.stop();
});

/** The room server, with a logger that keeps each entry as Cloud Logging would read it. */
async function loggedRoomServer() {
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

describe('the log of the reports', () => {
  it('should log each report kept with its dilemma, version and reason, and nothing of who wrote what', async () => {
    // Arrange
    const { server, entries } = await loggedRoomServer();
    const { roomId, dilemmas } = await gameInDecisionPhase(server);
    const luis = await TestClient.connected(server.url, 'luis', roomId);
    const [first] = dilemmas;

    // Act
    luis.send({
      type: 'report-dilemma',
      dilemmaId: first!.dilemmaId,
      reason: 'mistranslated',
      comment: 'TestComment',
      language: 'fr',
    });
    await luis.next('game-state');

    // Assert
    const reported = entries.filter(({ message }) => message === 'dilemma reported');
    expect(reported).toEqual([
      expect.objectContaining({
        severity: 'INFO',
        dilemmaId: first!.dilemmaId,
        version: 1,
        reason: 'mistranslated',
      }),
    ]);
    const logged = JSON.stringify(reported);
    expect(logged).not.toContain('TestComment');
    expect(logged).not.toContain('luis');
  });

  it('should not log a report the game turns down', async () => {
    // Arrange
    const { server, entries } = await loggedRoomServer();
    const { roomId } = await gameInDecisionPhase(server);
    const luis = await TestClient.connected(server.url, 'luis', roomId);

    // Act
    luis.send({
      type: 'report-dilemma',
      dilemmaId: 'not-in-this-game',
      reason: 'offensive',
      language: 'es',
    });
    await luis.next('error');

    // Assert
    expect(entries.filter(({ message }) => message === 'dilemma reported')).toEqual([]);
  });
});
