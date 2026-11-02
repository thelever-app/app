import { randomUUID } from 'node:crypto';
import {
  type Database,
  openDatabase,
  openListenClient,
  PostgresDilemmaRepository,
} from '@thelever-app/db';
import { endListeningConnections, useTestDatabase } from '@thelever-app/db/test';
import { loadSeedDilemmas, SEED_DILEMMAS } from '@thelever-app/dilemmas/seed';
import { CONTRACT_VERSION } from '@thelever-app/protocol';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { tokenOf } from '../support/fake-token-verifier.ts';
import { gameInDecisionPhase, startRoomServer, TestClient } from '../support/room-server.ts';

const database = useTestDatabase<Database>();
const running: { readonly stop: () => Promise<void> }[] = [];

beforeAll(async () => {
  await loadSeedDilemmas(new PostgresDilemmaRepository(database.db()));
});

afterEach(async () => {
  for (const { stop } of running.splice(0)) await stop();
});

/** An instance of the room server on the test database, with its own pool and short intervals. */
async function instance({ silentAfterMs = 300 } = {}) {
  const url = database.url();
  const opened = await openDatabase<Database>({ kind: 'url', url }, { maxConnections: 5 });
  const server = await startRoomServer({
    storage: {
      kind: 'postgres',
      db: opened.db,
      openListenClient: () => openListenClient({ kind: 'url', url }),
      instanceId: randomUUID(),
      beatEveryMs: 100,
      silentAfterMs,
    },
  });
  let stopped = false;
  running.push({
    stop: async () => {
      if (!stopped) await server.close();
      await opened.close();
    },
  });
  return {
    ...server,
    async close() {
      stopped = true;
      await server.close();
    },
    async shutdown() {
      stopped = true;
      await server.shutdown();
    },
  };
}

/** Connects `identity` to the game and returns the client and the id of its player. */
async function connect(url: string, identity: string, gameId: string) {
  const client = await TestClient.open(url);
  client.send({
    type: 'connect',
    contractVersion: CONTRACT_VERSION,
    token: tokenOf(identity),
    gameId,
    language: 'es',
  });
  const { playerId } = await client.next('game-state');
  return { client, playerId };
}

describe('the room server on several instances', () => {
  it('should let a player on each instance see the other connect and answer', async () => {
    // Arrange
    const a = await instance();
    const b = await instance();
    const { gameId } = await gameInDecisionPhase(a.http);
    const ana = await connect(a.url, 'ana', gameId);

    // Act
    const luis = await connect(b.url, 'luis', gameId);
    const [first] = SEED_DILEMMAS;
    luis.client.send({
      type: 'answer-dilemma',
      dilemmaId: first!.id,
      vote: first!.options[0]!.id,
    });

    // Assert
    expect(await ana.client.next('connection-changed')).toMatchObject({
      playerId: luis.playerId,
      connected: true,
    });
    expect(await ana.client.next('progress-updated')).toMatchObject({
      playerId: luis.playerId,
      progress: 1,
    });
  });

  it('should show the players of an instance that dies as disconnected', async () => {
    // Arrange
    const a = await instance();
    const b = await instance();
    const { gameId } = await gameInDecisionPhase(a.http);
    const ana = await connect(a.url, 'ana', gameId);
    const luis = await connect(b.url, 'luis', gameId);
    await ana.client.next('connection-changed');

    // Act: it stops at once, without closing anything in the database.
    await b.close();

    // Assert
    expect(await ana.client.next('connection-changed', 5000)).toMatchObject({
      playerId: luis.playerId,
      connected: false,
    });
  });

  it('should show the players of an instance that leaves as disconnected at once', async () => {
    // Arrange: nobody would take these instances for dead within the test.
    const a = await instance({ silentAfterMs: 60_000 });
    const b = await instance({ silentAfterMs: 60_000 });
    const { gameId } = await gameInDecisionPhase(a.http);
    const ana = await connect(a.url, 'ana', gameId);
    const luis = await connect(b.url, 'luis', gameId);
    await ana.client.next('connection-changed');
    const closeCode = new Promise<number>((resolve) => luis.client.socket.once('close', resolve));

    // Act
    await b.shutdown();

    // Assert
    expect(await ana.client.next('connection-changed', 1000)).toMatchObject({
      playerId: luis.playerId,
      connected: false,
    });
    expect(await closeCode).toBe(1012);
  });

  it('should send a fresh state to every socket after losing the connection that listens', async () => {
    // Arrange
    const a = await instance();
    const { gameId } = await gameInDecisionPhase(a.http);
    const ana = await connect(a.url, 'ana', gameId);

    // Act: the database ends the connection, as a restart or a network cut would.
    await endListeningConnections(database.db());

    // Assert
    expect(await ana.client.next('game-state', 5000)).toMatchObject({ gameId });
  });
});
