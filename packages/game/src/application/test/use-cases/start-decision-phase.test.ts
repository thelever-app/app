import { describe, expect, it } from 'vitest';
import { CreateRoomUseCase } from '../../use-cases/create-room.use-case.ts';
import { JoinRoomUseCase } from '../../use-cases/join-room.use-case.ts';
import { StartDecisionPhaseUseCase } from '../../use-cases/start-decision-phase.use-case.ts';
import { RoomNotFoundError } from '../../errors/room-not-found.error.ts';
import { DilemmaNotFoundError } from '../../errors/dilemma-not-found.error.ts';
import { TEST_DILEMMA_IDS, TEST_OPTION_IDS, testCatalog } from '../support/test-catalog.ts';
import { InMemoryRoomRepository } from '../../../adapters/in-memory/in-memory-room-repository.ts';
import { InMemoryGameRepository } from '../../../adapters/in-memory/in-memory-game-repository.ts';
import { SequentialIdGenerator } from '../../../adapters/in-memory/sequential-id-generator.ts';

describe('StartDecisionPhaseUseCase', () => {
  describe('execute', () => {
    it('should save a game of the room, with its dilemmas and players, in the decision phase', async () => {
      // Arrange
      const roomRepository = new InMemoryRoomRepository();
      const gameRepository = new InMemoryGameRepository();
      const idGenerator = new SequentialIdGenerator();
      const { roomId, hostId } = await new CreateRoomUseCase(roomRepository, idGenerator).execute({
        hostNickname: 'Ana',
        hostIdentity: 'TestAnaIdentity',
      });
      const { playerId } = await new JoinRoomUseCase(roomRepository, idGenerator).execute({
        roomId,
        nickname: 'Luis',
        identity: 'TestLuisIdentity',
      });
      const startDecisionPhase = new StartDecisionPhaseUseCase(
        roomRepository,
        gameRepository,
        testCatalog(),
        idGenerator,
      );

      // Act
      const { gameId } = await startDecisionPhase.execute({
        roomId,
        dilemmaIds: TEST_DILEMMA_IDS,
      });

      // Assert
      const game = await gameRepository.findById(gameId);
      expect(game?.roomId).toBe(roomId);
      expect(game?.dilemmas).toEqual(
        TEST_DILEMMA_IDS.map((dilemmaId) => ({ dilemmaId, optionIds: TEST_OPTION_IDS })),
      );
      expect(game?.isInDecisionPhase).toBe(true);
      expect(game?.playerIds).toEqual([hostId, playerId]);
    });

    it('should throw an error if the room does not exist', async () => {
      // Arrange
      const startDecisionPhase = new StartDecisionPhaseUseCase(
        new InMemoryRoomRepository(),
        new InMemoryGameRepository(),
        testCatalog(),
        new SequentialIdGenerator(),
      );

      // Act & Assert
      await expect(
        startDecisionPhase.execute({ roomId: 'TestUnknownId', dilemmaIds: TEST_DILEMMA_IDS }),
      ).rejects.toThrow(RoomNotFoundError);
    });

    it('should throw an error if a dilemma is not in the catalog, without saving any game', async () => {
      // Arrange
      const roomRepository = new InMemoryRoomRepository();
      const gameRepository = new InMemoryGameRepository();
      const idGenerator = new SequentialIdGenerator();
      const { roomId } = await new CreateRoomUseCase(roomRepository, idGenerator).execute({
        hostNickname: 'Ana',
        hostIdentity: 'TestAnaIdentity',
      });
      const startDecisionPhase = new StartDecisionPhaseUseCase(
        roomRepository,
        gameRepository,
        testCatalog(),
        idGenerator,
      );

      // Act & Assert
      await expect(
        startDecisionPhase.execute({ roomId, dilemmaIds: ['TestDilemma1', 'TestUnknownDilemma'] }),
      ).rejects.toThrow(DilemmaNotFoundError);
      expect(await gameRepository.findById('id-2')).toBeUndefined();
    });
  });
});
