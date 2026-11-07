import { SEED_DILEMMAS } from '@thelever-app/dilemmas/seed';
import { afterEach, describe, expect, it } from 'vitest';
import {
  gameInDecisionPhase,
  lobbyOfThree,
  startRoomServer,
  TestClient,
} from '../../support/room-server.ts';

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

describe('the decision phase over the room sockets', () => {
  let server: Awaited<ReturnType<typeof startRoomServer>> | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
  });

  it('should send each player the total time, the time of the server and their prediction subset', async () => {
    // Arrange
    server = await startRoomServer();

    // Act
    const { states } = await nominalGame(server);

    // Assert
    for (const state of states) {
      const ends = Date.parse(state.totalTimeEndsAt);
      expect(ends - Date.parse(state.serverTime)).toBeGreaterThan(5 * 60_000);
      expect(state.phase).toBe('decision');
      for (const dilemma of state.dilemmas) {
        expect(dilemma.predictionSubset).toHaveLength(2);
        expect(dilemma.predictionSubset).not.toContain(state.playerId);
      }
    }
  });

  it('should raise the progress of a nominal answer only once every prediction is made', async () => {
    // Arrange
    server = await startRoomServer();
    const { ana, luis, states } = await nominalGame(server);
    const luisState = states[1]!;
    const [first] = luisState.dilemmas;
    const vote = first!.options[0]!.optionId;

    // Act
    luis.send({ type: 'answer-dilemma', dilemmaId: first!.dilemmaId, vote, matchPrediction: 1 });
    const draft = await luis.next('game-state');
    luis.send({
      type: 'answer-dilemma',
      dilemmaId: first!.dilemmaId,
      vote,
      matchPrediction: 1,
      votePredictions: first!.predictionSubset.map((playerId) => ({ playerId, vote })),
    });
    await luis.next('game-state');

    // Assert
    expect(draft.answers).toEqual([
      { dilemmaId: first!.dilemmaId, vote, matchPrediction: 1, votePredictions: [] },
    ]);
    const progress = await ana.next('progress-updated');
    expect(progress.progress).toBe(1);
  });

  it('should let the host start the reveal, and tell everyone', async () => {
    // Arrange
    server = await startRoomServer();
    const { ana, luis } = await nominalGame(server);

    // Act
    ana.send({ type: 'start-reveal' });

    // Assert
    expect((await luis.next('game-state')).phase).toBe('reveal');
    expect((await ana.next('game-state')).phase).toBe('reveal');
  });

  it('should turn down a reveal started by anyone but the host', async () => {
    // Arrange
    server = await startRoomServer();
    const { luis } = await nominalGame(server);

    // Act
    luis.send({ type: 'start-reveal' });

    // Assert
    expect(await luis.next('error')).toEqual({
      type: 'error',
      command: 'start-reveal',
      code: 'not-host',
    });
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

  it('should skip a dilemma reported as offensive', async () => {
    // Arrange
    server = await startRoomServer();
    const { roomId, dilemmas } = await gameInDecisionPhase(server);
    const luis = await TestClient.connected(server.url, 'luis', roomId);

    // Act
    luis.send({ type: 'report-dilemma', dilemmaId: dilemmas[0]!.dilemmaId, reason: 'offensive' });

    // Assert
    const state = await luis.next('game-state');
    expect(state.didNotVote).toEqual([{ dilemmaId: dilemmas[0]!.dilemmaId, reason: 'reported' }]);
  });
});
