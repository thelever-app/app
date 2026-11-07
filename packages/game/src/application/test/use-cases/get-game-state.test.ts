import { KeepOrderRandomness } from '../../../domain/test/support/keep-order-randomness.ts';
import { describe, expect, it } from 'vitest';
import { AnswerDilemmaUseCase } from '../../use-cases/answer-dilemma.use-case.ts';
import { GetGameStateUseCase } from '../../use-cases/get-game-state.use-case.ts';
import { GameNotFoundError } from '../../errors/game-not-found.error.ts';
import { RoomNotFoundError } from '../../errors/room-not-found.error.ts';
import { PlayerNotInGameError } from '../../../domain/errors/player-not-in-game.error.ts';
import { Game } from '../../../domain/entities/game.ts';
import { InMemorySealProvider } from '../../../adapters/in-memory/in-memory-seal-provider.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { FixedIdGenerator } from '../../../domain/test/support/fixed-id-generator.ts';
import { DilemmaNotFoundError } from '../../errors/dilemma-not-found.error.ts';
import { ConnectPlayerUseCase } from '../../use-cases/connect-player.use-case.ts';
import { TEST_DILEMMA_IDS, TEST_OPTION_IDS } from '../support/test-catalog.ts';
import {
  gameInDecisionPhase as sharedGameInDecisionPhase,
  TEST_GAME_SETTINGS,
} from '../support/game-in-decision-phase.ts';

/** Ana hosts a room with Luis and Marta, and the game is in the decision phase. */
async function gameInDecisionPhase() {
  const game = await sharedGameInDecisionPhase();
  return {
    ...game,
    answerDilemma: new AnswerDilemmaUseCase({
      roomRepository: game.roomRepository,
      gameRepository: game.gameRepository,
      notifier: new InMemoryPlayerNotifier(),
      sealProvider: new InMemorySealProvider(),
      clock: game.clock,
    }),
    getGameState: new GetGameStateUseCase(game.roomRepository, game.gameRepository, game.catalog),
  };
}

describe('GetGameStateUseCase', () => {
  describe('execute', () => {
    it('should return the game, the player who asks and the content of the dilemmas in order', async () => {
      // Arrange
      const { getGameState, gameId, anaId, luisId } = await gameInDecisionPhase();

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
          predictionSubset: [],
          personInTheGap: null,
        })),
      );
      expect(state.phase).toBe('decision');
      expect(state.hostId).toBe(anaId);
      expect(state.totalTimeRanOut).toBe(false);
    });

    it('should return every player with their nickname, avatar and progress', async () => {
      // Arrange
      const {
        getGameState,
        answerDilemma,
        roomRepository,
        roomId,
        gameId,
        anaId,
        luisId,
        martaId,
      } = await gameInDecisionPhase();
      const room = await roomRepository.findById(roomId);
      const avatarOf = (playerId: string) => {
        const avatar = room?.players.find(({ id }) => id === playerId)?.avatar;
        return avatar && { face: avatar.face, color: avatar.color };
      };
      await answerDilemma.execute({
        roomId,
        playerId: luisId,
        dilemmaId: 'TestDilemma1',
        vote: 'TestOption',
      });
      await answerDilemma.execute({
        roomId,
        playerId: luisId,
        dilemmaId: 'TestDilemma2',
        vote: 'TestOption',
      });

      // Act
      const state = await getGameState.execute({ gameId, playerId: anaId, language: 'es' });

      // Assert
      expect(state.players).toEqual([
        {
          playerId: anaId,
          nickname: 'Ana',
          avatar: avatarOf(anaId),
          progress: 0,
          connected: false,
          left: false,
        },
        {
          playerId: luisId,
          nickname: 'Luis',
          avatar: avatarOf(luisId),
          progress: 2,
          connected: false,
          left: false,
        },
        {
          playerId: martaId,
          nickname: 'Marta',
          avatar: avatarOf(martaId),
          progress: 0,
          connected: false,
          left: false,
        },
      ]);
    });

    it('should return whether each player is connected', async () => {
      // Arrange
      const { getGameState, roomRepository, roomId, gameId, anaId, luisId } =
        await gameInDecisionPhase();
      const connectPlayer = new ConnectPlayerUseCase(
        roomRepository,
        new InMemoryPlayerNotifier(),
        new FixedIdGenerator('TestConnectionId'),
      );
      await connectPlayer.execute({ roomId, identity: 'TestLuisIdentity' });

      // Act
      const state = await getGameState.execute({ gameId, playerId: anaId, language: 'es' });

      // Assert
      const connected = state.players.map(({ playerId, connected }) => ({ playerId, connected }));
      expect(connected).toContainEqual({ playerId: luisId, connected: true });
      expect(connected).toContainEqual({ playerId: anaId, connected: false });
    });

    it('should return the version of the game and of the room it was computed from', async () => {
      // Arrange
      const { getGameState, answerDilemma, roomRepository, roomId, gameId, luisId } =
        await gameInDecisionPhase();
      await answerDilemma.execute({
        roomId,
        playerId: luisId,
        dilemmaId: 'TestDilemma1',
        vote: 'TestOption',
      });
      await new ConnectPlayerUseCase(
        roomRepository,
        new InMemoryPlayerNotifier(),
        new FixedIdGenerator('TestConnectionId'),
      ).execute({ roomId, identity: 'TestLuisIdentity' });

      // Act
      const state = await getGameState.execute({ gameId, playerId: luisId, language: 'es' });

      // Assert
      expect(state.gameVersion).toBe(2);
      expect(state.roomVersion).toBe((await roomRepository.findById(roomId))?.version);
    });

    it('should return the answers of the player who asks', async () => {
      // Arrange
      const { getGameState, answerDilemma, roomId, gameId, luisId } = await gameInDecisionPhase();
      await answerDilemma.execute({
        roomId,
        playerId: luisId,
        dilemmaId: 'TestDilemma1',
        vote: 'TestOption',
      });

      // Act
      const state = await getGameState.execute({ gameId, playerId: luisId, language: 'es' });

      // Assert
      expect(state.answers).toEqual([
        {
          dilemmaId: 'TestDilemma1',
          vote: 'TestOption',
          matchPrediction: null,
          votePredictions: [],
        },
      ]);
    });

    it('should never return the answers of the other players', async () => {
      // Arrange
      const { getGameState, answerDilemma, roomId, gameId, anaId, luisId } =
        await gameInDecisionPhase();
      await answerDilemma.execute({
        roomId,
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
          'avatar',
          'connected',
          'left',
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
          dilemmas: [
            {
              dilemmaId: 'TestGoneDilemma',
              version: 1,
              optionIds: TEST_OPTION_IDS,
              hasGap: false,
              origin: 'picked-by-the-host',
            },
          ],
          settings: TEST_GAME_SETTINGS,
        },
        new FixedIdGenerator('TestGoneGameId'),
      );
      game.startDecisionPhase(room.players, new Date(), new KeepOrderRandomness());
      await gameRepository.save(game);

      // Act & Assert
      await expect(
        getGameState.execute({ gameId: game.id, playerId: luisId, language: 'es' }),
      ).rejects.toThrow(DilemmaNotFoundError);
    });

    it('should ask the catalog for the version of each dilemma the game plays', async () => {
      // Arrange
      const { getGameState, gameRepository, roomRepository, luisId } = await gameInDecisionPhase();
      const room = (await roomRepository.findById('id-1'))!;
      const [dilemmaId] = TEST_DILEMMA_IDS;
      const game = Game.create(
        {
          roomId: room.id,
          dilemmas: [
            {
              dilemmaId: dilemmaId!,
              version: 2,
              optionIds: TEST_OPTION_IDS,
              hasGap: false,
              origin: 'picked-by-the-host',
            },
          ],
          settings: TEST_GAME_SETTINGS,
        },
        new FixedIdGenerator('TestLaterVersionGameId'),
      );
      game.startDecisionPhase(room.players, new Date(), new KeepOrderRandomness());
      await gameRepository.save(game);

      // Act & Assert: the test catalog only has the first version of its dilemmas.
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
            version: 1,
            optionIds: TEST_OPTION_IDS,
            hasGap: false,
            origin: 'picked-by-the-host' as const,
          })),
          settings: TEST_GAME_SETTINGS,
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
