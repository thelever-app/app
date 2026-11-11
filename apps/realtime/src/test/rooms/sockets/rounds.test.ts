import { SEED_DILEMMAS } from '@thelever-app/dilemmas/seed';
import { afterEach, describe, expect, it } from 'vitest';
import { CONTRACT_VERSION } from '@thelever-app/protocol';
import {
  gameInDecisionPhase,
  JOIN_AVATAR,
  lobbyOfThree,
  post,
  startRoomServer,
  TestClient,
} from '../../support/room-server.ts';
import { tokenOf } from '../../support/fake-token-verifier.ts';

/** Ana hosts Luis and Marta in a nominal game of the seed dilemmas, and all three are connected. */
async function nominalGame(server: Awaited<ReturnType<typeof startRoomServer>>) {
  const { roomId } = await lobbyOfThree(server.http);
  const ana = await TestClient.connected(server.url, 'ana', roomId, 'room-state');
  ana.send({ type: 'pick-dilemmas', dilemmaIds: SEED_DILEMMAS.map(({ id }) => id) });
  await ana.next('room-state');
  const luis = await TestClient.connected(server.url, 'luis', roomId, 'room-state');
  const marta = await TestClient.connected(server.url, 'marta', roomId, 'room-state');
  ana.send({ type: 'start-game' });
  const states = await Promise.all([ana, luis, marta].map((client) => client.next('game-state')));
  return { roomId, ana, luis, marta, states };
}

describe('the rounds over the room sockets', () => {
  let server: Awaited<ReturnType<typeof startRoomServer>> | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
  });

  it('should send each player the first round, its time, the time of the server and who they predict', async () => {
    // Arrange
    server = await startRoomServer();

    // Act
    const { states } = await nominalGame(server);

    // Assert
    for (const state of states) {
      expect(state.round).toMatchObject({ position: 0, phase: 'decision', revealedBy: null });
      const left = Date.parse(state.round.endsAt) - Date.parse(state.serverTime);
      expect(left).toBeGreaterThan(55_000);
      expect(left).toBeLessThanOrEqual(60_000);
      expect(state.reveal).toBeNull();
      expect(state.playersToPredict).toHaveLength(2);
      expect(state.playersToPredict).not.toContain(state.playerId);
    }
  });

  it('should take whoever joins once the game started into its round, and show them to the others', async () => {
    // Arrange
    server = await startRoomServer();
    const { roomId, ana, states } = await nominalGame(server);

    // Act
    const joined = await post(`${server.http}/rooms/${roomId}/players`, 'pedro', {
      nickname: 'Pedro',
      avatar: JOIN_AVATAR,
    });
    const pedro = await TestClient.open(server.url);
    pedro.send({
      type: 'connect',
      contractVersion: CONTRACT_VERSION,
      token: tokenOf('pedro'),
      roomId,
      language: 'es',
    });
    const own = await pedro.next('game-state');

    // Assert
    expect(joined.joinedLate).toBe(true);
    expect(own.round).toMatchObject({ position: 0, phase: 'decision' });
    expect(own.playersToPredict).toEqual([]);
    expect(own.code).toHaveLength(5);
    const toAna = await ana.next('game-state');
    expect(toAna.players.map(({ nickname }) => nickname)).toContain('Pedro');
    expect(toAna.playersToPredict).toEqual(states[0]!.playersToPredict);
  });

  it('should tell the others who answered only once every prediction is made', async () => {
    // Arrange
    server = await startRoomServer();
    const { ana, luis, states } = await nominalGame(server);
    const [first] = states[1]!.dilemmas;
    const vote = first!.options[0]!.optionId;

    // Act
    const [someone, ...rest] = states[1]!.playersToPredict;
    luis.send({
      type: 'answer-dilemma',
      dilemmaId: first!.dilemmaId,
      vote,
      votePredictions: [{ playerId: someone!, vote }],
    });
    const draft = await luis.next('game-state');
    luis.send({
      type: 'answer-dilemma',
      dilemmaId: first!.dilemmaId,
      vote,
      votePredictions: [someone!, ...rest].map((playerId) => ({ playerId, vote })),
    });
    await luis.next('game-state');

    // Assert
    expect(draft.answers).toEqual([
      { dilemmaId: first!.dilemmaId, vote, votePredictions: [{ playerId: someone, vote }] },
    ]);
    expect(await ana.next('player-answered')).toMatchObject({ playerId: states[1]!.playerId });
  });

  it('should let the host reveal the dilemma early, and tell everyone what it shows', async () => {
    // Arrange
    server = await startRoomServer();
    const { ana, luis } = await nominalGame(server);

    // Act
    ana.send({ type: 'reveal-early' });

    // Assert
    const seen = await luis.next('game-state');
    expect(seen.round).toMatchObject({ phase: 'reveal', revealedBy: 'host' });
    expect(seen.reveal).toMatchObject({ position: 0, didNotVoteCount: 3 });
    expect((await ana.next('game-state')).round.phase).toBe('reveal');
  });

  it('should turn down an early reveal by anyone but the host', async () => {
    // Arrange
    server = await startRoomServer();
    const { luis } = await nominalGame(server);

    // Act
    luis.send({ type: 'reveal-early' });

    // Assert
    expect(await luis.next('error')).toEqual({
      type: 'error',
      command: 'reveal-early',
      code: 'not-host',
    });
  });

  it('should take everyone to the next round when any player moves on, and say who', async () => {
    // Arrange
    server = await startRoomServer();
    const { ana, luis, marta, states } = await nominalGame(server);
    ana.send({ type: 'reveal-early' });
    await Promise.all([ana, luis, marta].map((client) => client.next('game-state')));

    // Act
    marta.send({ type: 'move-on', fromPosition: 0 });

    // Assert
    const seen = await luis.next('game-state');
    expect(seen.round).toMatchObject({
      position: 1,
      phase: 'decision',
      movedOnBy: states[2]!.playerId,
    });
    expect(seen.reveal).toBeNull();
  });

  it('should pass the role of a host who leaves, and close their socket', async () => {
    // Arrange
    server = await startRoomServer();
    const { ana, luis, states } = await nominalGame(server);

    // Act
    ana.send({ type: 'leave-room' });

    // Assert
    await ana.closed();
    const after = await luis.next('game-state');
    expect(after.hostId).toBe(states[1]!.playerId);
    expect(after.players.find(({ playerId }) => playerId === states[0]!.playerId)?.left).toBe(true);
  });

  it('should close every socket of a player who leaves, also another tab', async () => {
    // Arrange
    server = await startRoomServer();
    const { roomId, luis } = await nominalGame(server);
    const otherTab = await TestClient.connected(server.url, 'luis', roomId, 'game-state');

    // Act
    luis.send({ type: 'leave-room' });

    // Assert
    await luis.closed();
    await otherTab.closed();
  });

  it('should let a player skip a dilemma they reported as offensive', async () => {
    // Arrange
    server = await startRoomServer();
    const { roomId, dilemmas } = await gameInDecisionPhase(server);
    const luis = await TestClient.connected(server.url, 'luis', roomId);

    // Act
    luis.send({ type: 'report-dilemma', dilemmaId: dilemmas[0]!.dilemmaId, reason: 'offensive' });
    const reported = await luis.next('game-state');
    luis.send({ type: 'skip-dilemma', dilemmaId: dilemmas[0]!.dilemmaId });

    // Assert
    expect(reported.reports).toEqual([{ dilemmaId: dilemmas[0]!.dilemmaId, offensive: true }]);
    const state = await luis.next('game-state');
    expect(state.didNotVote).toEqual([{ dilemmaId: dilemmas[0]!.dilemmaId, reason: 'reported' }]);
  });
});
