import { SEED_DILEMMAS } from '@thelever-app/dilemmas/seed';
import { CONTRACT_VERSION } from '@thelever-app/protocol';
import { afterEach, describe, expect, it } from 'vitest';
import { tokenOf } from '../../support/fake-token-verifier.ts';
import { gameInDecisionPhase, startRoomServer, TestClient } from '../../support/room-server.ts';

const [FIRST, SECOND, THIRD] = SEED_DILEMMAS;

function connectMessage(identity: string, gameId: string) {
  return {
    type: 'connect',
    contractVersion: CONTRACT_VERSION,
    token: tokenOf(identity),
    gameId,
    language: 'es',
  };
}

describe('RoomSocketServer', () => {
  let server: Awaited<ReturnType<typeof startRoomServer>> | undefined;

  afterEach(async () => {
    await server?.stop();
    server = undefined;
  });

  describe('serving', () => {
    it('should keep serving HTTP on the port of the sockets', async () => {
      // Arrange
      server = await startRoomServer();

      // Act
      const response = await fetch(`${server.http}/health`);

      // Assert
      expect(response.status).toBe(200);
    });
  });

  describe('connect', () => {
    it('should answer with the game state of whoever connects', async () => {
      // Arrange
      server = await startRoomServer();
      const { gameId } = await gameInDecisionPhase(server.http);
      const luis = await TestClient.open(server.url);

      // Act
      luis.send(connectMessage('luis', gameId));

      // Assert
      const state = await luis.next('game-state');
      expect(state.gameId).toBe(gameId);
      expect(state.dilemmas.map(({ dilemmaId }) => dilemmaId)).toEqual(
        SEED_DILEMMAS.map(({ id }) => id),
      );
      expect(state.players.find(({ playerId }) => playerId === state.playerId)?.nickname).toBe(
        'Luis',
      );
      expect(state.answers).toEqual([]);
    });

    it('should tell the players already connected', async () => {
      // Arrange
      server = await startRoomServer();
      const { gameId } = await gameInDecisionPhase(server.http);
      const ana = await TestClient.connected(server.url, 'ana', gameId);

      // Act
      const luis = await TestClient.connected(server.url, 'luis', gameId);

      // Assert
      const change = await ana.next('connection-changed');
      expect(change.connected).toBe(true);
      expect(luis.received).toEqual([]);
    });

    it.each([
      [
        'an unsupported contract version',
        { contractVersion: CONTRACT_VERSION + 1 },
        'unsupported-contract-version',
      ],
      ['an invalid token', { token: 'forged' }, 'invalid-token'],
      ['a game that does not exist', { gameId: 'unknown-game' }, 'game-not-found'],
    ] as const)('should reject %s', async (_case, change, code) => {
      // Arrange
      server = await startRoomServer();
      const { gameId } = await gameInDecisionPhase(server.http);
      const luis = await TestClient.open(server.url);

      // Act
      luis.send({ ...connectMessage('luis', gameId), ...change });

      // Assert
      expect(await luis.next('error')).toEqual({ type: 'error', command: 'connect', code });
    });

    it('should reject an identity that does not play the game', async () => {
      // Arrange
      server = await startRoomServer();
      const { gameId } = await gameInDecisionPhase(server.http);
      const stranger = await TestClient.open(server.url);

      // Act
      stranger.send(connectMessage('stranger', gameId));

      // Assert
      expect(await stranger.next('error')).toEqual({
        type: 'error',
        command: 'connect',
        code: 'player-not-in-game',
      });
    });
  });

  describe('answer-dilemma', () => {
    it('should send a fresh state to whoever answers and the new progress to the others', async () => {
      // Arrange
      server = await startRoomServer();
      const { gameId } = await gameInDecisionPhase(server.http);
      const ana = await TestClient.connected(server.url, 'ana', gameId);
      const luis = await TestClient.connected(server.url, 'luis', gameId);
      await ana.next('connection-changed');

      // Act
      luis.send({ type: 'answer-dilemma', dilemmaId: FIRST!.id, vote: FIRST!.options[0]!.id });

      // Assert
      const state = await luis.next('game-state');
      expect(state.answers).toEqual([{ dilemmaId: FIRST!.id, vote: FIRST!.options[0]!.id }]);
      const progress = await ana.next('progress-updated');
      expect(progress).toEqual({
        type: 'progress-updated',
        gameVersion: state.gameVersion,
        playerId: state.playerId,
        progress: 1,
      });
    });

    it('should apply the answers of one game in the order they arrive', async () => {
      // Arrange
      server = await startRoomServer();
      const { gameId } = await gameInDecisionPhase(server.http);
      const luis = await TestClient.connected(server.url, 'luis', gameId);

      // Act
      for (const dilemma of [FIRST!, SECOND!, THIRD!]) {
        luis.send({ type: 'answer-dilemma', dilemmaId: dilemma.id, vote: dilemma.options[0]!.id });
      }

      // Assert
      const versions = [];
      for (let i = 0; i < 3; i += 1) versions.push((await luis.next('game-state')).gameVersion);
      expect(versions).toEqual([...versions].sort((a, b) => a - b));
      expect(luis.received.filter(({ type }) => type === 'error')).toEqual([]);
    });

    it('should reject an answer before connecting', async () => {
      // Arrange
      server = await startRoomServer();
      const luis = await TestClient.open(server.url);

      // Act
      luis.send({ type: 'answer-dilemma', dilemmaId: FIRST!.id, vote: FIRST!.options[0]!.id });

      // Assert
      expect(await luis.next('error')).toEqual({
        type: 'error',
        command: 'answer-dilemma',
        code: 'not-connected',
      });
    });

    it('should answer a rule of the game that is broken with its code', async () => {
      // Arrange
      server = await startRoomServer();
      const { gameId } = await gameInDecisionPhase(server.http);
      const luis = await TestClient.connected(server.url, 'luis', gameId);

      // Act
      luis.send({ type: 'answer-dilemma', dilemmaId: SECOND!.id, vote: SECOND!.options[0]!.id });

      // Assert
      expect(await luis.next('error')).toEqual({
        type: 'error',
        command: 'answer-dilemma',
        code: 'dilemma-not-reached',
      });
    });
  });

  describe('disconnection', () => {
    it('should tell the others when a socket closes', async () => {
      // Arrange
      server = await startRoomServer();
      const { gameId } = await gameInDecisionPhase(server.http);
      const ana = await TestClient.connected(server.url, 'ana', gameId);
      const luis = await TestClient.connected(server.url, 'luis', gameId);
      await ana.next('connection-changed');

      // Act
      luis.socket.close();

      // Assert
      const change = await ana.next('connection-changed');
      expect(change.connected).toBe(false);
    });

    it('should end a socket that stops answering the pings, and tell the others', async () => {
      // Arrange
      server = await startRoomServer({ pingIntervalMs: 50 });
      const { gameId } = await gameInDecisionPhase(server.http);
      const ana = await TestClient.connected(server.url, 'ana', gameId);
      const luis = await TestClient.open(server.url, { autoPong: false });
      luis.send(connectMessage('luis', gameId));
      await luis.next('game-state');
      await ana.next('connection-changed');

      // Act
      await luis.closed();

      // Assert
      const change = await ana.next('connection-changed');
      expect(change.connected).toBe(false);
    });

    it('should keep a socket that answers the pings', async () => {
      // Arrange
      server = await startRoomServer({ pingIntervalMs: 50 });
      const { gameId } = await gameInDecisionPhase(server.http);
      const ana = await TestClient.connected(server.url, 'ana', gameId);

      // Act
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Assert
      expect(ana.socket.readyState).toBe(ana.socket.OPEN);
    });
  });

  describe('messages that cannot be read', () => {
    it.each([
      ['text that is not JSON', 'not json', null],
      ['a type no schema knows', { type: 'start-reveal' }, null],
      [
        'a known type with a wrong shape',
        { type: 'answer-dilemma', dilemmaId: '' },
        'answer-dilemma',
      ],
    ] as const)('should answer invalid-message to %s', async (_case, message, command) => {
      // Arrange
      server = await startRoomServer();
      const client = await TestClient.open(server.url);

      // Act
      client.send(message);

      // Assert
      expect(await client.next('error')).toEqual({
        type: 'error',
        command,
        code: 'invalid-message',
      });
    });
  });
});
