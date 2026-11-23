import { InMemoryUsage } from '../../../adapters/in-memory/in-memory-usage.ts';
import { describe, expect, it } from 'vitest';
import { AnswerDilemmaUseCase } from '../../use-cases/answer-dilemma.use-case.ts';
import { ConnectPlayerUseCase } from '../../use-cases/connect-player.use-case.ts';
import { DisconnectPlayerUseCase } from '../../use-cases/disconnect-player.use-case.ts';
import { GetGameStateUseCase } from '../../use-cases/get-game-state.use-case.ts';
import { GetRoomStateUseCase } from '../../use-cases/get-room-state.use-case.ts';
import { JoinRoomUseCase } from '../../use-cases/join-room.use-case.ts';
import { LikeDilemmaUseCase } from '../../use-cases/like-dilemma.use-case.ts';
import { GetReadyToMoveOnUseCase } from '../../use-cases/get-ready-to-move-on.use-case.ts';
import { MoveOnUseCase } from '../../use-cases/move-on.use-case.ts';
import { UnlikeDilemmaUseCase } from '../../use-cases/unlike-dilemma.use-case.ts';
import { ReactUseCase } from '../../use-cases/react.use-case.ts';
import { RevealEarlyUseCase } from '../../use-cases/reveal-early.use-case.ts';
import { RestartGameUseCase } from '../../use-cases/restart-game.use-case.ts';
import { StartRematchUseCase } from '../../use-cases/start-rematch.use-case.ts';
import { GameNotEndedError } from '../../../domain/errors/game-not-ended.error.ts';
import { NotHostError } from '../../../domain/errors/not-host.error.ts';
import { DilemmaLikedEvent } from '../../../domain/events/dilemma-liked.event.ts';
import { DilemmaUnlikedEvent } from '../../../domain/events/dilemma-unliked.event.ts';
import { HostChangedEvent } from '../../../domain/events/host-changed.event.ts';
import { LobbyChangedEvent } from '../../../domain/events/lobby-changed.event.ts';
import { ReactionsChangedEvent } from '../../../domain/events/reactions-changed.event.ts';
import { InMemoryDilemmaLikes } from '../../../adapters/in-memory/in-memory-dilemma-likes.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { InMemorySealProvider } from '../../../adapters/in-memory/in-memory-seal-provider.ts';
import { gameInDecisionPhase } from '../support/game-in-decision-phase.ts';

const LUIS_SEAL = {
  gameConsentVersion: 'TestGameConsentVersion',
  researchConsentVersion: null,
  commercialLicenceConsentVersion: null,
  underEighteen: true,
  objectsToAnalytics: false,
};

/** Ana hosts Luis and Marta in a nominal game of the three test dilemmas, all three connected. */
async function arrange() {
  const notifier = new InMemoryPlayerNotifier();
  const game = await gameInDecisionPhase(notifier, 'nominal');
  const { roomRepository, gameRepository, clock, catalog } = game;
  const sealProvider = new InMemorySealProvider(new Map([['TestLuisIdentity', LUIS_SEAL]]));
  const likes = new InMemoryDilemmaLikes();
  const connectPlayer = new ConnectPlayerUseCase(
    roomRepository,
    gameRepository,
    notifier,
    game.idGenerator,
    clock,
  );
  const connections = new Map<string, string>();
  for (const [name, playerId] of [
    ['Ana', game.anaId],
    ['Luis', game.luisId],
    ['Marta', game.martaId],
  ] as const) {
    const { connectionId } = await connectPlayer.execute({
      roomId: game.roomId,
      identity: `Test${name}Identity`,
    });
    connections.set(playerId, connectionId);
  }
  const ports = { roomRepository, gameRepository, notifier, clock };
  return {
    ...game,
    notifier,
    likes,
    connections,
    answerDilemma: new AnswerDilemmaUseCase({ ...ports, sealProvider, dilemmaCatalog: catalog }),
    revealEarly: new RevealEarlyUseCase(roomRepository, gameRepository, notifier, clock),
    moveOn: new MoveOnUseCase(roomRepository, gameRepository, notifier, clock, new InMemoryUsage()),
    getReadyToMoveOn: new GetReadyToMoveOnUseCase(
      roomRepository,
      gameRepository,
      notifier,
      clock,
      new InMemoryUsage(),
    ),
    react: new ReactUseCase({ ...ports, sealProvider }),
    likeDilemma: new LikeDilemmaUseCase({ ...ports, likes, sealProvider }),
    unlikeDilemma: new UnlikeDilemmaUseCase({ ...ports, likes }),
    startRematch: new StartRematchUseCase(roomRepository, gameRepository, notifier),
    restartGame: new RestartGameUseCase(roomRepository, gameRepository, notifier),
    getGameState: new GetGameStateUseCase(roomRepository, gameRepository, catalog, likes),
    getRoomState: new GetRoomStateUseCase(roomRepository, catalog),
    disconnectPlayer: new DisconnectPlayerUseCase(
      roomRepository,
      gameRepository,
      notifier,
      clock,
      new InMemoryUsage(),
    ),
    joinRoom: new JoinRoomUseCase(
      {
        sealProvider: new InMemorySealProvider(),
        ...ports,
        idGenerator: game.idGenerator,
        randomness: game.randomness,
      },
      new InMemoryUsage(),
    ),
  };
}

type Arranged = Awaited<ReturnType<typeof arrange>>;

/**
 * Everyone votes the first option of the round and the host reveals it. Ana and Luis predict the
 * others did, which is right; Marta predicts the other option, which is wrong.
 */
async function playRound(arranged: Arranged, position: number): Promise<void> {
  const { answerDilemma, revealEarly, roomId, dilemmaIds, anaId, luisId, martaId } = arranged;
  const everyone = [anaId, luisId, martaId];
  for (const playerId of everyone) {
    await answerDilemma.execute({
      language: 'es',
      roomId,
      playerId,
      dilemmaId: dilemmaIds[position]!,
      vote: 'TestOption',
      votePredictions: everyone
        .filter((other) => other !== playerId)
        .map((other) => ({
          playerId: other,
          vote: playerId === martaId ? 'TestOtherOption' : 'TestOption',
        })),
    });
  }
  await revealEarly.execute({ roomId, playerId: anaId });
}

/** Every round played, and the reveal of the last one on. */
async function toTheLastReveal(arranged: Arranged): Promise<void> {
  const last = arranged.dilemmaIds.length - 1;
  for (let position = 0; position <= last; position += 1) {
    await playRound(arranged, position);
    if (position < last) {
      await arranged.moveOn.execute({
        roomId: arranged.roomId,
        playerId: arranged.anaId,
        fromPosition: position,
      });
    }
  }
}

/** Every round played, then through every screen of the results, to the end of the game. */
async function toTheEnd(arranged: Arranged): Promise<void> {
  await toTheLastReveal(arranged);
  await throughTheResults(arranged);
}

/**
 * From the reveal of the last round, through every screen of the results, to the end of the game:
 * on each one, those players are ready to move on, everyone unless they are given.
 */
async function throughTheResults(
  arranged: Arranged,
  ready: readonly string[] = [arranged.anaId, arranged.luisId, arranged.martaId],
): Promise<void> {
  const { getReadyToMoveOn, getGameState, roomId, gameId, luisId } = arranged;
  let state = await getGameState.execute({ gameId, playerId: luisId, language: 'es' });
  let from = arranged.dilemmaIds.length - 1;
  while (state.stage.kind !== 'ended') {
    for (const playerId of ready) {
      await getReadyToMoveOn.execute({ roomId, playerId, fromPosition: from });
    }
    state = await getGameState.execute({ gameId, playerId: luisId, language: 'es' });
    from = arranged.dilemmaIds.length + (state.stage.step ?? 0);
  }
}

describe('The end of the game', () => {
  describe('ReactUseCase', () => {
    it('should keep the reaction with the seal of the player and tell everyone', async () => {
      // Arrange
      const arranged = await arrange();
      const { react, gameRepository, notifier, roomId, gameId, luisId, anaId } = arranged;
      await playRound(arranged, 0);

      // Act
      await react.execute({
        roomId,
        playerId: luisId,
        position: 0,
        target: { kind: 'vote', playerId: anaId },
        emoji: '😮',
      });

      // Assert
      const game = await gameRepository.findById(gameId);
      expect(game?.reactions()).toEqual([
        {
          dilemmaId: arranged.dilemmaIds[0],
          playerId: luisId,
          aboutId: anaId,
          emoji: '😮',
          seal: LUIS_SEAL,
        },
      ]);
      expect(notifier.receivedBy(anaId).at(-1)).toEqual(
        new ReactionsChangedEvent(gameId, 0, game!.version),
      );
    });
  });

  describe('LikeDilemmaUseCase', () => {
    it('should keep one like per identity and dilemma, with its seal, and tell only who gave it', async () => {
      // Arrange
      const arranged = await arrange();
      const { likeDilemma, likes, notifier, getGameState, roomId, gameId, luisId, anaId } =
        arranged;
      await playRound(arranged, 0);
      const before = notifier.receivedBy(anaId).length;

      // Act
      await likeDilemma.execute({ roomId, playerId: luisId, position: 0 });
      await likeDilemma.execute({ roomId, playerId: luisId, position: 0 });

      // Assert
      expect(likes.likes).toEqual([
        expect.objectContaining({
          identity: 'TestLuisIdentity',
          dilemmaId: arranged.dilemmaIds[0],
          seal: LUIS_SEAL,
          weight: 1,
        }),
      ]);
      expect(likes.weightOf(arranged.dilemmaIds[0]!)).toBe(1);
      expect(notifier.receivedBy(luisId).at(-1)).toBeInstanceOf(DilemmaLikedEvent);
      expect(notifier.receivedBy(anaId)).toHaveLength(before);
      const state = await getGameState.execute({ gameId, playerId: luisId, language: 'es' });
      expect(state.reveal?.youLiked).toBe(true);
    });

    it('should do nothing outside the reveal of that dilemma', async () => {
      // Arrange
      const arranged = await arrange();
      const { likeDilemma, likes, roomId, luisId } = arranged;

      // Act
      await likeDilemma.execute({ roomId, playerId: luisId, position: 0 });

      // Assert
      expect(likes.likes).toEqual([]);
    });
  });

  describe('UnlikeDilemmaUseCase', () => {
    it('should take back the like during the reveal of its dilemma, and tell only who took it back', async () => {
      // Arrange
      const arranged = await arrange();
      const { likeDilemma, unlikeDilemma, likes, notifier, getGameState, roomId, gameId } =
        arranged;
      const { luisId, anaId } = arranged;
      await playRound(arranged, 0);
      await likeDilemma.execute({ roomId, playerId: luisId, position: 0 });
      const before = notifier.receivedBy(anaId).length;

      // Act
      await unlikeDilemma.execute({ roomId, playerId: luisId, position: 0 });

      // Assert
      expect(likes.likes).toEqual([]);
      expect(likes.weightOf(arranged.dilemmaIds[0]!)).toBe(0);
      expect(notifier.receivedBy(luisId).at(-1)).toBeInstanceOf(DilemmaUnlikedEvent);
      expect(notifier.receivedBy(anaId)).toHaveLength(before);
      const state = await getGameState.execute({ gameId, playerId: luisId, language: 'es' });
      expect(state.reveal?.youLiked).toBe(false);
    });

    it('should keep the like once the reveal of its dilemma is over', async () => {
      // Arrange
      const arranged = await arrange();
      const { likeDilemma, unlikeDilemma, moveOn, likes, roomId, anaId, luisId } = arranged;
      await playRound(arranged, 0);
      await likeDilemma.execute({ roomId, playerId: luisId, position: 0 });
      await moveOn.execute({ roomId, playerId: anaId, fromPosition: 0 });

      // Act
      await unlikeDilemma.execute({ roomId, playerId: luisId, position: 0 });

      // Assert
      expect(likes.weightOf(arranged.dilemmaIds[0]!)).toBe(1);
    });
  });

  describe('MoveOnUseCase and GetGameStateUseCase', () => {
    it('should take a nominal room through its results, showing each player only who knows them best', async () => {
      // Arrange
      const arranged = await arrange();
      const { moveOn, getGameState, roomId, gameId, anaId, luisId, dilemmaIds } = arranged;
      await toTheLastReveal(arranged);

      // Act
      await moveOn.execute({ roomId, playerId: anaId, fromPosition: dilemmaIds.length - 1 });

      // Assert
      const state = await getGameState.execute({ gameId, playerId: luisId, language: 'es' });
      expect(state.stage).toEqual({ kind: 'results', movedOnBy: anaId, step: 0 });
      expect(state.ranking).toHaveLength(3);
      expect(state.results?.titles.at(-1)?.title).toBe('el-mentalista');
      expect(state.results?.knownBestBy?.playerIds).toEqual([arranged.anaId]);
    });

    it('should hand the role of a host still disconnected over when the game ends', async () => {
      // Arrange
      const arranged = await arrange();
      const { disconnectPlayer, roomRepository, notifier, connections, roomId, anaId, luisId } =
        arranged;
      await toTheLastReveal(arranged);
      await disconnectPlayer.execute({
        roomId,
        playerId: anaId,
        connectionId: connections.get(anaId)!,
      });

      // Act
      await throughTheResults(arranged, [luisId, arranged.martaId]);

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.host.id).toBe(luisId);
      expect(notifier.receivedBy(luisId)).toContainEqual(
        new HostChangedEvent(roomId, luisId, expect.any(Number)),
      );
    });
  });

  describe('StartRematchUseCase', () => {
    it('should take everyone to the lobby of a rematch that does not repeat the dilemmas played', async () => {
      // Arrange
      const arranged = await arrange();
      const { startRematch, getRoomState, roomRepository, notifier, roomId, anaId, luisId } =
        arranged;
      await toTheEnd(arranged);
      const host = (await roomRepository.findById(roomId))!.host.id;

      // Act
      await startRematch.execute({ roomId, playerId: host });

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.isInLobby).toBe(true);
      expect(room?.playedDilemmaIds).toEqual(arranged.dilemmaIds);
      expect(notifier.receivedBy(luisId).at(-1)).toEqual(
        new LobbyChangedEvent(roomId, 'rematch-started', room!.version),
      );
      const lobby = await getRoomState.execute({ roomId, playerId: anaId, language: 'es' });
      expect(
        lobby.rounds.every((round) => round.origin !== 'random' || round.withoutNewDilemmas),
      ).toBe(true);
    });

    it('should not start a rematch before the game ends', async () => {
      // Arrange
      const arranged = await arrange();
      const { startRematch, roomId, anaId } = arranged;

      // Act & Assert
      await expect(startRematch.execute({ roomId, playerId: anaId })).rejects.toThrow(
        GameNotEndedError,
      );
    });
  });

  describe('RestartGameUseCase', () => {
    it('should stop the game and take everyone to the lobby of a new game, with only the dilemmas revealed as played', async () => {
      // Arrange
      const arranged = await arrange();
      const { restartGame, moveOn, roomRepository, gameRepository, notifier } = arranged;
      const { roomId, gameId, anaId, luisId, dilemmaIds } = arranged;
      await playRound(arranged, 0);
      await moveOn.execute({ roomId, playerId: anaId, fromPosition: 0 });

      // Act
      await restartGame.execute({ roomId, playerId: anaId });

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.isInLobby).toBe(true);
      expect(room?.playedDilemmaIds).toEqual([dilemmaIds[0]]);
      expect((await gameRepository.findById(gameId))?.stage.kind).toBe('stopped');
      expect(notifier.receivedBy(luisId).at(-1)).toEqual(
        new LobbyChangedEvent(roomId, 'rematch-started', room!.version),
      );
    });

    it('should keep the votes given before restarting', async () => {
      // Arrange
      const arranged = await arrange();
      const { restartGame, answerDilemma, gameRepository, roomId, gameId, anaId, luisId } =
        arranged;
      await answerDilemma.execute({
        language: 'es',
        roomId,
        playerId: luisId,
        dilemmaId: arranged.dilemmaIds[0]!,
        vote: 'TestOption',
        votePredictions: [
          { playerId: anaId, vote: 'TestOption' },
          { playerId: arranged.martaId, vote: 'TestOption' },
        ],
      });

      // Act
      await restartGame.execute({ roomId, playerId: anaId });

      // Assert
      const game = await gameRepository.findById(gameId);
      expect(game?.answersOf(luisId).map(({ vote }) => vote)).toEqual(['TestOption']);
    });

    it('should not let a player who is not the host restart the game', async () => {
      // Arrange
      const { restartGame, roomId, luisId } = await arrange();

      // Act & Assert
      await expect(restartGame.execute({ roomId, playerId: luisId })).rejects.toThrow(NotHostError);
    });
  });

  describe('JoinRoomUseCase, once the rounds are over', () => {
    it('should let who comes during the results watch them without playing the game', async () => {
      // Arrange
      const arranged = await arrange();
      const { joinRoom, getGameState, gameRepository, moveOn, roomId, gameId, anaId } = arranged;
      await toTheLastReveal(arranged);
      await moveOn.execute({
        roomId,
        playerId: anaId,
        fromPosition: arranged.dilemmaIds.length - 1,
      });

      // Act
      const { playerId, joinedLate } = await joinRoom.execute({
        roomId,
        nickname: 'Pedro',
        identity: 'TestPedroIdentity',
        avatar: { face: 'face-04', color: 'teal' },
      });

      // Assert
      expect(joinedLate).toBe(false);
      expect((await gameRepository.findById(gameId))?.playerIds).not.toContain(playerId);
      const state = await getGameState.execute({ gameId, playerId, language: 'es' });
      expect(state).toMatchObject({ inGame: false, answers: [], stage: { kind: 'results' } });
      expect(state.ranking?.map((ranked) => ranked.playerId)).not.toContain(playerId);
    });

    it('should let the player wait in the room for the rematch, seeing the end without playing it', async () => {
      // Arrange
      const arranged = await arrange();
      const { joinRoom, getGameState, gameRepository, roomId, gameId } = arranged;
      await toTheEnd(arranged);

      // Act
      const { playerId, joinedLate } = await joinRoom.execute({
        roomId,
        nickname: 'Pedro',
        identity: 'TestPedroIdentity',
        avatar: { face: 'face-04', color: 'teal' },
      });

      // Assert
      expect(joinedLate).toBe(false);
      expect((await gameRepository.findById(gameId))?.playerIds).not.toContain(playerId);
      const state = await getGameState.execute({ gameId, playerId, language: 'es' });
      expect(state).toMatchObject({ inGame: false, answers: [], stage: { kind: 'ended' } });
    });
  });
});
