import { CONTRACT_VERSION } from '@thelever-app/protocol';
import { afterEach, describe, expect, it } from 'vitest';
import { tokenOf } from '../../support/fake-token-verifier.ts';
import {
  lobbyOfThree,
  post,
  ROOM_CHOICES,
  startRoomServer,
  TestClient,
} from '../../support/room-server.ts';

/** What the room shows of the choices it was created with. */
const ROOM_CHOICES_SEEN = { groupNature: ROOM_CHOICES.groupNature, place: ROOM_CHOICES.place };

let server: Awaited<ReturnType<typeof startRoomServer>> | undefined;

afterEach(async () => {
  await server?.stop();
  server = undefined;
});

/** The room as `identity` sees it, from another socket of theirs, which then closes. */
async function stateSeenBy(url: string, identity: string, roomId: string) {
  const client = await TestClient.open(url);
  client.send({
    type: 'connect',
    contractVersion: CONTRACT_VERSION,
    token: tokenOf(identity),
    roomId,
    language: 'es',
  });
  const state = await client.next('room-state');
  client.socket.close();
  return state;
}

/** Ana, Luis and Marta in the lobby, each one connected from a socket of their own. */
async function connectedLobby() {
  server = await startRoomServer();
  const { roomId, code } = await lobbyOfThree(server.http);
  const ana = await TestClient.connected(server.url, 'ana', roomId, 'room-state');
  const luis = await TestClient.connected(server.url, 'luis', roomId, 'room-state');
  const marta = await TestClient.connected(server.url, 'marta', roomId, 'room-state');
  // Each one learnt of the others connecting; only what comes next matters to the tests.
  for (const client of [ana, luis, marta]) client.received.length = 0;
  return { server, roomId, code, ana, luis, marta };
}

describe('the lobby over the room sockets', () => {
  it('should answer whoever connects to a room with no game with the state of the room', async () => {
    // Arrange
    server = await startRoomServer();
    const { roomId, code } = await lobbyOfThree(server.http);

    // Act
    const state = await stateSeenBy(server.url, 'luis', roomId);

    // Assert
    expect(state).toMatchObject({ roomId, code, currentGameId: null, ...ROOM_CHOICES_SEEN });
    expect(state.players.map(({ nickname }) => nickname)).toEqual(['Ana', 'Luis', 'Marta']);
    expect(state.players.find(({ playerId }) => playerId === state.playerId)?.nickname).toBe(
      'Luis',
    );
    expect(state.hostId).toBe(state.players[0]?.playerId);
  });

  it('should give back their place in the lobby to a player who opens the room again, as a reload does', async () => {
    // Arrange
    const { server: started, roomId, ana, luis } = await connectedLobby();
    const before = await stateSeenBy(started.url, 'luis', roomId);
    luis.socket.close();
    await ana.next('connection-changed');

    // Act
    const again = await TestClient.open(started.url);
    again.send({
      type: 'connect',
      contractVersion: CONTRACT_VERSION,
      token: tokenOf('luis'),
      roomId,
      language: 'es',
    });
    const state = await again.next('room-state');
    const backOnline = await ana.next('connection-changed');

    // Assert
    expect(state).toMatchObject({ playerId: before.playerId, currentGameId: null });
    expect(state.players.map(({ nickname }) => nickname)).toEqual(['Ana', 'Luis', 'Marta']);
    expect(backOnline).toMatchObject({ playerId: before.playerId, connected: true });
  });

  it('should show everyone in the lobby who joins, as soon as they join', async () => {
    // Arrange
    const { server: started, roomId, ana } = await connectedLobby();

    // Act
    await post(`${started.http}/rooms/${roomId}/players`, 'pablo', { nickname: 'Pablo' });

    // Assert
    const state = await ana.next('room-state');
    expect(state.players.map(({ nickname }) => nickname)).toEqual([
      'Ana',
      'Luis',
      'Marta',
      'Pablo',
    ]);
  });

  it('should show everyone the configuration the host changes', async () => {
    // Arrange
    const { ana, luis } = await connectedLobby();

    // Act
    ana.send({ type: 'change-settings', changes: { variant: 'anonymous', dilemmaCount: 12 } });

    // Assert
    for (const client of [ana, luis]) {
      const { settings } = await client.next('room-state');
      expect(settings).toMatchObject({ variant: 'anonymous', dilemmaCount: 12 });
    }
  });

  it('should answer not-host to a player who is not the host and tries to configure', async () => {
    // Arrange
    const { luis } = await connectedLobby();

    // Act
    luis.send({ type: 'change-settings', changes: { variant: 'anonymous' } });

    // Assert
    expect(await luis.next('error')).toEqual({
      type: 'error',
      command: 'change-settings',
      code: 'not-host',
    });
  });

  it('should show everyone the avatar a player takes, and refuse one already taken', async () => {
    // Arrange
    const { server: started, roomId, ana, luis } = await connectedLobby();
    const before = await stateSeenBy(started.url, 'ana', roomId);
    const taken = before.players.find(({ nickname }) => nickname === 'Ana')!.avatar;
    const free = { face: 'face-12', color: 'stone' } as const;

    // Act
    luis.send({ type: 'change-avatar', ...free });
    const seen = await ana.next('room-state');
    luis.received.length = 0;
    luis.send({ type: 'change-avatar', ...taken });

    // Assert
    expect(seen.players.find(({ nickname }) => nickname === 'Luis')?.avatar).toEqual(free);
    expect((await luis.next('error')).code).toBe('avatar-taken');
  });

  it('should let a player add a dilemma that nobody can tell is theirs, and the host remove it', async () => {
    // Arrange
    const { ana, luis } = await connectedLobby();
    ana.send({ type: 'change-settings', changes: { dilemmasPerPlayer: 1 } });
    await luis.next('room-state');
    await ana.next('room-state');

    // Act
    luis.send({ type: 'add-dilemma', dilemmaId: 'seed-trolley' });
    const seenByAna = await ana.next('room-state');
    const seenByLuis = await luis.next('room-state');
    ana.send({ type: 'remove-added-dilemma', dilemmaId: 'seed-trolley' });
    const afterRemoving = await ana.next('room-state');

    // Assert
    expect(seenByAna.addedDilemmas.map(({ dilemmaId }) => dilemmaId)).toEqual(['seed-trolley']);
    expect(seenByAna.ownAddedDilemmaIds).toEqual([]);
    expect(seenByLuis.ownAddedDilemmaIds).toEqual(['seed-trolley']);
    expect(JSON.stringify(seenByAna.addedDilemmas)).not.toContain(seenByLuis.playerId);
    expect(afterRemoving.addedDilemmas).toEqual([]);
  });

  it('should let a player remove a dilemma they added, and refuse more than the host allows', async () => {
    // Arrange
    const { ana, luis } = await connectedLobby();
    ana.send({ type: 'change-settings', changes: { dilemmasPerPlayer: 1 } });
    await luis.next('room-state');
    luis.send({ type: 'add-dilemma', dilemmaId: 'seed-trolley' });
    await luis.next('room-state');

    // Act
    luis.send({ type: 'add-dilemma', dilemmaId: 'seed-wallet' });
    const refused = await luis.next('error');
    luis.send({ type: 'remove-added-dilemma', dilemmaId: 'seed-trolley' });
    const afterRemoving = await luis.next('room-state');

    // Assert
    expect(refused).toEqual({
      type: 'error',
      command: 'add-dilemma',
      code: 'too-many-added-dilemmas',
    });
    expect(afterRemoving.addedDilemmas).toEqual([]);
    expect(afterRemoving.ownAddedDilemmaIds).toEqual([]);
  });

  it('should tell an expelled player and close their socket, and show the others who is left', async () => {
    // Arrange
    const { server: started, roomId, ana, marta } = await connectedLobby();
    const before = await stateSeenBy(started.url, 'ana', roomId);
    const martaId = before.players.find(({ nickname }) => nickname === 'Marta')!.playerId;

    // Act
    ana.send({ type: 'expel-player', playerId: martaId });

    // Assert
    expect(await marta.next('expelled')).toEqual({ type: 'expelled' });
    await marta.closed();
    const left = await ana.next('room-state');
    expect(left.players.map(({ nickname }) => nickname)).toEqual(['Ana', 'Luis']);
  });

  it('should start the game for everyone, put together by the server', async () => {
    // Arrange
    const { ana, luis, marta } = await connectedLobby();

    // Act
    ana.send({ type: 'start-game' });

    // Assert
    const states = await Promise.all([ana, luis, marta].map((client) => client.next('game-state')));
    expect(new Set(states.map(({ gameId }) => gameId)).size).toBe(1);
    expect(states[0]!.dilemmas.length).toBeGreaterThan(0);
    expect(states.map(({ dilemmas }) => dilemmas)).toEqual(states.map(() => states[0]!.dilemmas));
  });

  it('should answer not-enough-players to a host alone', async () => {
    // Arrange
    server = await startRoomServer();
    const { roomId } = await post(`${server.http}/rooms`, 'ana', {
      nickname: 'Ana',
      ...ROOM_CHOICES,
    });
    const ana = await TestClient.connected(server.url, 'ana', roomId!, 'room-state');

    // Act
    ana.send({ type: 'start-game' });

    // Assert
    expect(await ana.next('error')).toEqual({
      type: 'error',
      command: 'start-game',
      code: 'not-enough-players',
    });
  });

  it('should answer dilemmas-missing to a start in categories with no dilemma for the room', async () => {
    // Arrange: the seed has no dilemma of justice.
    const { ana } = await connectedLobby();
    ana.send({ type: 'change-settings', changes: { categories: ['justice'] } });
    await ana.next('room-state');

    // Act
    ana.send({ type: 'start-game' });

    // Assert
    expect(await ana.next('error')).toEqual({
      type: 'error',
      command: 'start-game',
      code: 'dilemmas-missing',
    });
  });

  it('should answer not-connected to a command of the lobby before connecting', async () => {
    // Arrange
    server = await startRoomServer();
    const client = await TestClient.open(server.url);

    // Act
    client.send({ type: 'start-game' });

    // Assert
    expect((await client.next('error')).code).toBe('not-connected');
  });
});
