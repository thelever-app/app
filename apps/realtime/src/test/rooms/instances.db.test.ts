import { randomUUID } from 'node:crypto';
import {
  ConsoleLogger,
  type Database,
  openDatabase,
  openListenClient,
  PostgresDilemmaRepository,
} from '@thelever-app/db';
import { endListeningConnections, useTestDatabase } from '@thelever-app/db/test';
import { loadSeedDilemmas } from '@thelever-app/dilemmas/seed';
import { CONTRACT_VERSION } from '@thelever-app/protocol';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { tokenOf } from '../support/fake-token-verifier.ts';
import {
  gameInDecisionPhase,
  JOIN_AVATAR,
  lobbyOfThree,
  post,
  startRoomServer,
  TestClient,
} from '../support/room-server.ts';

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
  const opened = await openDatabase<Database>(
    { kind: 'url', url },
    {
      maxConnections: 5,
      logger: new ConsoleLogger(),
    },
  );
  const instanceId = randomUUID();
  const server = await startRoomServer({
    storage: {
      kind: 'postgres',
      db: opened.db,
      openListenClient: () => openListenClient({ kind: 'url', url }),
      instanceId,
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
    instanceId,
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
async function connect(url: string, identity: string, roomId: string) {
  const client = await TestClient.open(url);
  client.send({
    type: 'connect',
    contractVersion: CONTRACT_VERSION,
    token: tokenOf(identity),
    roomId,
    language: 'es',
  });
  const { playerId } = await client.next('game-state');
  return { client, playerId };
}

describe('the room server on several instances', () => {
  it('should show a player on another instance what changes in the lobby, and start the game for them', async () => {
    // Arrange
    const a = await instance();
    const b = await instance();
    const { roomId } = await lobbyOfThree(a.http);
    const ana = await TestClient.connected(a.url, 'ana', roomId, 'room-state');
    const luis = await TestClient.connected(b.url, 'luis', roomId, 'room-state');
    await TestClient.connected(b.url, 'marta', roomId, 'room-state');
    luis.received.length = 0;

    // Act
    ana.send({ type: 'change-settings', changes: { variant: 'anonymous' } });
    const changed = await luis.next('room-state', 5000);
    ana.send({ type: 'start-game' });

    // Assert
    expect(changed.settings.variant).toBe('anonymous');
    const started = await luis.next('game-state', 5000);
    expect(started.gameId).toBe((await ana.next('game-state', 5000)).gameId);
  });

  it('should let a player on each instance see the other connect and answer', async () => {
    // Arrange
    const a = await instance();
    const b = await instance();
    const { roomId, dilemmas } = await gameInDecisionPhase(a);
    const ana = await connect(a.url, 'ana', roomId);

    // Act
    const luis = await connect(b.url, 'luis', roomId);
    const [first] = dilemmas;
    luis.client.send({
      type: 'answer-dilemma',
      dilemmaId: first!.dilemmaId,
      vote: first!.options[0]!.optionId,
    });

    // Assert
    expect(await ana.client.next('connection-changed')).toMatchObject({
      playerId: luis.playerId,
      connected: true,
    });
    expect(await ana.client.next('answered-count')).toMatchObject({ answeredCount: 1 });
  });

  it('should take a player who joins on another instance into the game in progress', async () => {
    // Arrange
    const a = await instance();
    const b = await instance();
    const { roomId } = await gameInDecisionPhase(a);
    const ana = await connect(a.url, 'ana', roomId);

    // Act
    const joined = await post(`${b.http}/rooms/${roomId}/players`, 'pedro', {
      nickname: 'Pedro',
      avatar: JOIN_AVATAR,
    });
    const pedro = await connect(b.url, 'pedro', roomId);

    // Assert
    expect(joined.joinedLate).toBe(true);
    await expect
      .poll(async () => {
        const state = await ana.client.next('game-state', 5000);
        return state.players.map(({ playerId }) => playerId);
      })
      .toContain(pedro.playerId);
  });

  it('should show the players of an instance that dies as disconnected', async () => {
    // Arrange
    const a = await instance();
    const b = await instance();
    const { roomId } = await gameInDecisionPhase(a);
    const ana = await connect(a.url, 'ana', roomId);
    const luis = await connect(b.url, 'luis', roomId);
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
    const { roomId } = await gameInDecisionPhase(a);
    const ana = await connect(a.url, 'ana', roomId);
    const luis = await connect(b.url, 'luis', roomId);
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

  it('should make the players of an instance taken for dead while alive connect again', async () => {
    // Arrange
    const a = await instance({ silentAfterMs: 60_000 });
    const { roomId } = await gameInDecisionPhase(a);
    const ana = await connect(a.url, 'ana', roomId);
    const closeCode = new Promise<number>((resolve, reject) => {
      ana.client.socket.once('close', resolve);
      setTimeout(() => reject(new Error('the socket stayed open')), 2000);
    });

    // Act: another instance took it for dead, closed its connections and forgot it.
    await database
      .db()
      .deleteFrom('room_connections')
      .where('instance_id', '=', a.instanceId)
      .execute();
    await database.db().deleteFrom('instances').where('id', '=', a.instanceId).execute();

    // Assert
    expect(await closeCode).toBe(1012);
    expect((await connect(a.url, 'ana', roomId)).playerId).toBe(ana.playerId);
  });

  it('should send a fresh state to every socket after losing the connection that listens', async () => {
    // Arrange
    const a = await instance();
    const { roomId, gameId } = await gameInDecisionPhase(a);
    const ana = await connect(a.url, 'ana', roomId);

    // Act: the database ends the connection, as a restart or a network cut would.
    await endListeningConnections(database.db());

    // Assert
    expect(await ana.client.next('game-state', 5000)).toMatchObject({ gameId });
  });
});

describe('the room server on PostgreSQL', () => {
  it('should reveal the dilemma of a round whose time is over when an answer comes after it', async () => {
    // Arrange: the timer of the instance would run the round out in a minute, but its time is over.
    const a = await instance();
    const { roomId, gameId, dilemmas } = await gameInDecisionPhase(a);
    const ana = await connect(a.url, 'ana', roomId);
    const luis = await connect(a.url, 'luis', roomId);
    const now = Date.now();
    await database
      .db()
      .updateTable('games')
      .set({ round_started_at: new Date(now - 61_000), round_ends_at: new Date(now - 1000) })
      .where('id', '=', gameId)
      .execute();
    ana.client.received.length = 0;

    // Act
    const [first] = dilemmas;
    luis.client.send({
      type: 'answer-dilemma',
      dilemmaId: first!.dilemmaId,
      vote: first!.options[0]!.optionId,
    });

    // Assert
    const revealed = await ana.client.next('game-state', 3000);
    expect(revealed.round).toMatchObject({ position: 0, phase: 'reveal', revealedBy: 'time' });
    const saved = await database
      .db()
      .selectFrom('games')
      .select(['round_phase', 'round_revealed_by'])
      .where('id', '=', gameId)
      .executeTakeFirstOrThrow();
    expect(saved).toEqual({ round_phase: 'reveal', round_revealed_by: 'time' });
  });
});
