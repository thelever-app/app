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

const DILEMMAS = ['TestDilemma1', 'TestDilemma2', 'TestDilemma3'];

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
  const { gameId } = await new StartDecisionPhaseUseCase(
    roomRepository,
    gameRepository,
    idGenerator,
  ).execute({ roomId, dilemmaIds: DILEMMAS });

  return {
    gameRepository,
    roomRepository,
    answerDilemma: new AnswerDilemmaUseCase(gameRepository, new InMemoryPlayerNotifier()),
    getGameState: new GetGameStateUseCase(roomRepository, gameRepository),
    gameId,
    anaId,
    luisId,
    martaId,
  };
}

describe('GetGameStateUseCase', () => {
  describe('execute', () => {
    it('should return the game, the player who asks and the dilemmas in order', async () => {
      // Arrange
      const { getGameState, gameId, luisId } = await gameInDecisionPhase();

      // Act
      const state = await getGameState.execute({ gameId, playerId: luisId });

      // Assert
      expect(state.gameId).toBe(gameId);
      expect(state.playerId).toBe(luisId);
      expect(state.dilemmaIds).toEqual(DILEMMAS);
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
      const state = await getGameState.execute({ gameId, playerId: anaId });

      // Assert
      expect(state.players).toEqual([
        { playerId: anaId, nickname: 'Ana', progress: 0 },
        { playerId: luisId, nickname: 'Luis', progress: 2 },
        { playerId: martaId, nickname: 'Marta', progress: 0 },
      ]);
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
      const state = await getGameState.execute({ gameId, playerId: luisId });

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
      const state = await getGameState.execute({ gameId, playerId: anaId });

      // Assert
      expect(state.answers).toEqual([]);
      expect(JSON.stringify(state)).not.toContain('TestSecretOption');
    });

    it('should throw an error if the game does not exist', async () => {
      // Arrange
      const { getGameState, luisId } = await gameInDecisionPhase();

      // Act & Assert
      await expect(
        getGameState.execute({ gameId: 'TestUnknownGameId', playerId: luisId }),
      ).rejects.toThrow(GameNotFoundError);
    });

    it('should throw an error if the player is not in the game', async () => {
      // Arrange
      const { getGameState, gameId } = await gameInDecisionPhase();

      // Act & Assert
      await expect(getGameState.execute({ gameId, playerId: 'TestStrangerId' })).rejects.toThrow(
        PlayerNotInGameError,
      );
    });

    it('should throw an error if the room of the game does not exist', async () => {
      // Arrange
      const { getGameState, gameRepository, luisId } = await gameInDecisionPhase();
      const orphan = Game.create(
        { roomId: 'TestUnknownRoomId', dilemmaIds: DILEMMAS },
        new FixedIdGenerator('TestOrphanGameId'),
      );
      await gameRepository.save(orphan);

      // Act & Assert
      await expect(getGameState.execute({ gameId: orphan.id, playerId: luisId })).rejects.toThrow(
        RoomNotFoundError,
      );
    });
  });
});
