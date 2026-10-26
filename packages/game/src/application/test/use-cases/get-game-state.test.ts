import { describe, expect, it } from 'vitest';
import { CreateRoomUseCase } from '../../use-cases/create-room.use-case.ts';
import { JoinRoomUseCase } from '../../use-cases/join-room.use-case.ts';
import { StartDecisionPhaseUseCase } from '../../use-cases/start-decision-phase.use-case.ts';
import { AnswerDilemmaUseCase } from '../../use-cases/answer-dilemma.use-case.ts';
import { GetGameStateUseCase } from '../../use-cases/get-game-state.use-case.ts';
import { GameNotFoundError } from '../../errors/game-not-found.error.ts';
import { RoomNotFoundError } from '../../errors/room-not-found.error.ts';
import { PlayerNotInGameError } from '../../../domain/errors/player-not-in-game.error.ts';
import { Game } from '../../../domain/entities/game.ts';
import { InMemoryRoomRepository } from '../../../adapters/in-memory/in-memory-room-repository.ts';
import { InMemoryGameRepository } from '../../../adapters/in-memory/in-memory-game-repository.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { SequentialIdGenerator } from '../../../adapters/in-memory/sequential-id-generator.ts';
import { FixedIdGenerator } from '../../../domain/test/support/fixed-id-generator.ts';
import { DilemmaNotFoundError } from '../../errors/dilemma-not-found.error.ts';
import { ConnectPlayerUseCase } from '../../use-cases/connect-player.use-case.ts';
import { TEST_DILEMMA_IDS, TEST_OPTION_IDS, testCatalog } from '../support/test-catalog.ts';

/** Ana hosts a room with Luis and Marta, and the game is in the decision phase. */
async function gameInDecisionPhase() {
  const roomRepository = new InMemoryRoomRepository();
  const gameRepository = new InMemoryGameRepository();
  const idGenerator = new SequentialIdGenerator();
  const joinRoom = new JoinRoomUseCase(roomRepository, idGenerator);

  const { roomId, hostId: anaId } = await new CreateRoomUseCase(
    roomRepository,
    idGenerator,
  ).execute({ hostNickname: 'Ana' });
  const { playerId: luisId } = await joinRoom.execute({ roomId, nickname: 'Luis' });
  const { playerId: martaId } = await joinRoom.execute({ roomId, nickname: 'Marta' });
  const catalog = testCatalog();
  const { gameId } = await new StartDecisionPhaseUseCase(
    roomRepository,
    gameRepository,
    catalog,
    idGenerator,
  ).execute({ roomId, dilemmaIds: TEST_DILEMMA_IDS });

  return {
    gameRepository,
    roomRepository,
    answerDilemma: new AnswerDilemmaUseCase(gameRepository, new InMemoryPlayerNotifier()),
    getGameState: new GetGameStateUseCase(roomRepository, gameRepository, catalog),
    gameId,
    anaId,
    luisId,
    martaId,
  };
}

describe('GetGameStateUseCase', () => {
  describe('execute', () => {
    it('should return the game, the player who asks and the content of the dilemmas in order', async () => {
      // Arrange
      const { getGameState, gameId, luisId } = await gameInDecisionPhase();

      // Act
      const state = await getGameState.execute({ gameId, playerId: luisId, language: 'es' });

      // Assert
      expect(state.gameId).toBe(gameId);
      expect(state.playerId).toBe(luisId);
      expect(state.dilemmas).toEqual(
        TEST_DILEMMA_IDS.map((dilemmaId) => ({
          dilemmaId,
          text: `TextOf${dilemmaId}`,
          options: TEST_OPTION_IDS.map((optionId) => ({ optionId, text: `TextOf${optionId}` })),
        })),
      );
    });

    it('should return every player with their nickname and progress', async () => {
      // Arrange
      const { getGameState, answerDilemma, gameId, anaId, luisId, martaId } =
        await gameInDecisionPhase();
      await answerDilemma.execute({
        gameId,
        playerId: luisId,
        dilemmaId: 'TestDilemma1',
        vote: 'TestOption',
      });
      await answerDilemma.execute({
        gameId,
        playerId: luisId,
        dilemmaId: 'TestDilemma2',
        vote: 'TestOption',
      });

      // Act
      const state = await getGameState.execute({ gameId, playerId: anaId, language: 'es' });

      // Assert
      expect(state.players).toEqual([
        { playerId: anaId, nickname: 'Ana', progress: 0, connected: false },
        { playerId: luisId, nickname: 'Luis', progress: 2, connected: false },
        { playerId: martaId, nickname: 'Marta', progress: 0, connected: false },
      ]);
    });

    it('should return whether each player is connected', async () => {
      // Arrange
      const { getGameState, gameRepository, roomRepository, gameId, anaId, luisId } =
        await gameInDecisionPhase();
      const connectPlayer = new ConnectPlayerUseCase(
        roomRepository,
        gameRepository,
        new InMemoryPlayerNotifier(),
        new FixedIdGenerator('TestConnectionId'),
      );
      await connectPlayer.execute({ gameId, playerId: luisId });

      // Act
      const state = await getGameState.execute({ gameId, playerId: anaId, language: 'es' });

      // Assert
      const connected = state.players.map(({ playerId, connected }) => ({ playerId, connected }));
      expect(connected).toContainEqual({ playerId: luisId, connected: true });
      expect(connected).toContainEqual({ playerId: anaId, connected: false });
    });

    it('should return the version of the game and of the room it was computed from', async () => {
      // Arrange
      const { getGameState, answerDilemma, gameRepository, roomRepository, gameId, luisId } =
        await gameInDecisionPhase();
      await answerDilemma.execute({
        gameId,
        playerId: luisId,
        dilemmaId: 'TestDilemma1',
        vote: 'TestOption',
      });
      await new ConnectPlayerUseCase(
        roomRepository,
        gameRepository,
        new InMemoryPlayerNotifier(),
        new FixedIdGenerator('TestConnectionId'),
      ).execute({ gameId, playerId: luisId });

      // Act
      const state = await getGameState.execute({ gameId, playerId: luisId, language: 'es' });

      // Assert
      expect(state.gameVersion).toBe(2);
      expect(state.roomVersion).toBe(1);
    });

    it('should return the answers of the player who asks', async () => {
      // Arrange
      const { getGameState, answerDilemma, gameId, luisId } = await gameInDecisionPhase();
      await answerDilemma.execute({
        gameId,
        playerId: luisId,
        dilemmaId: 'TestDilemma1',
        vote: 'TestOption',
      });

      // Act
      const state = await getGameState.execute({ gameId, playerId: luisId, language: 'es' });

      // Assert
      expect(state.answers).toEqual([{ dilemmaId: 'TestDilemma1', vote: 'TestOption' }]);
    });

    it('should never return the answers of the other players', async () => {
      // Arrange
      const { getGameState, answerDilemma, gameId, anaId, luisId } = await gameInDecisionPhase();
      await answerDilemma.execute({
        gameId,
        playerId: luisId,
        dilemmaId: 'TestDilemma1',
        vote: 'TestSecretOption',
      });

      // Act
      const state = await getGameState.execute({ gameId, playerId: anaId, language: 'es' });

      // Assert
      expect(state.answers).toEqual([]);
      for (const player of state.players) {
        expect(Object.keys(player).sort()).toEqual([
          'connected',
          'nickname',
          'playerId',
          'progress',
        ]);
      }
    });

    it('should throw an error if the game does not exist', async () => {
      // Arrange
      const { getGameState, luisId } = await gameInDecisionPhase();

      // Act & Assert
      await expect(
        getGameState.execute({ gameId: 'TestUnknownGameId', playerId: luisId, language: 'es' }),
      ).rejects.toThrow(GameNotFoundError);
    });

    it('should throw an error if the player is not in the game', async () => {
      // Arrange
      const { getGameState, gameId } = await gameInDecisionPhase();

      // Act & Assert
      await expect(
        getGameState.execute({ gameId, playerId: 'TestStrangerId', language: 'es' }),
      ).rejects.toThrow(PlayerNotInGameError);
    });

    it('should throw an error if a dilemma of the game is no longer in the catalog', async () => {
      // Arrange
      const { getGameState, gameRepository, roomRepository, luisId } = await gameInDecisionPhase();
      const room = (await roomRepository.findById('id-1'))!;
      const game = Game.create(
        {
          roomId: room.id,
          dilemmas: [{ dilemmaId: 'TestGoneDilemma', optionIds: TEST_OPTION_IDS }],
        },
        new FixedIdGenerator('TestGoneGameId'),
      );
      game.startDecisionPhase(room.players);
      await gameRepository.save(game);

      // Act & Assert
      await expect(
        getGameState.execute({ gameId: game.id, playerId: luisId, language: 'es' }),
      ).rejects.toThrow(DilemmaNotFoundError);
    });

    it('should throw an error if the room of the game does not exist', async () => {
      // Arrange
      const { getGameState, gameRepository, luisId } = await gameInDecisionPhase();
      const orphan = Game.create(
        {
          roomId: 'TestUnknownRoomId',
          dilemmas: TEST_DILEMMA_IDS.map((dilemmaId) => ({
            dilemmaId,
            optionIds: TEST_OPTION_IDS,
          })),
        },
        new FixedIdGenerator('TestOrphanGameId'),
      );
      await gameRepository.save(orphan);

      // Act & Assert
      await expect(
        getGameState.execute({ gameId: orphan.id, playerId: luisId, language: 'es' }),
      ).rejects.toThrow(RoomNotFoundError);
    });
  });
});
