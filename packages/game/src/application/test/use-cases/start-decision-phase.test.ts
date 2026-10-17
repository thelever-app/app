import { describe, expect, it } from 'vitest';
import { CreateRoomUseCase } from '../../use-cases/create-room.use-case.ts';
import { JoinRoomUseCase } from '../../use-cases/join-room.use-case.ts';
import { StartDecisionPhaseUseCase } from '../../use-cases/start-decision-phase.use-case.ts';
import { RoomNotFoundError } from '../../errors/room-not-found.error.ts';
import { InMemoryRoomRepository } from '../../../adapters/in-memory/in-memory-room-repository.ts';
import { InMemoryGameRepository } from '../../../adapters/in-memory/in-memory-game-repository.ts';
import { SequentialIdGenerator } from '../../../adapters/in-memory/sequential-id-generator.ts';

const DILEMMAS = ['TestDilemma1', 'TestDilemma2', 'TestDilemma3'];

describe('StartDecisionPhaseUseCase', () => {
  describe('execute', () => {
    it('should save a game of the room, with its dilemmas and players, in the decision phase', async () => {
      // Arrange
      const roomRepository = new InMemoryRoomRepository();
      const gameRepository = new InMemoryGameRepository();
      const idGenerator = new SequentialIdGenerator();
      const { roomId, hostId } = await new CreateRoomUseCase(roomRepository, idGenerator).execute({
        hostNickname: 'Ana',
      });
      const { playerId } = await new JoinRoomUseCase(roomRepository, idGenerator).execute({
        roomId,
        nickname: 'Luis',
      });
      const startDecisionPhase = new StartDecisionPhaseUseCase(
        roomRepository,
        gameRepository,
        idGenerator,
      );

      // Act
      const { gameId } = await startDecisionPhase.execute({ roomId, dilemmaIds: DILEMMAS });

      // Assert
      const game = await gameRepository.findById(gameId);
      expect(game?.roomId).toBe(roomId);
      expect(game?.dilemmas).toEqual(DILEMMAS);
      expect(game?.isInDecisionPhase).toBe(true);
      expect(game?.playerIds).toEqual([hostId, playerId]);
    });

    it('should throw an error if the room does not exist', async () => {
      // Arrange
      const startDecisionPhase = new StartDecisionPhaseUseCase(
        new InMemoryRoomRepository(),
        new InMemoryGameRepository(),
        new SequentialIdGenerator(),
      );

      // Act & Assert
      await expect(
        startDecisionPhase.execute({ roomId: 'TestUnknownId', dilemmaIds: DILEMMAS }),
      ).rejects.toThrow(RoomNotFoundError);
    });
  });
});
