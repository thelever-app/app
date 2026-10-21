import { describe, expect, it } from 'vitest';
import { InMemoryGameRepository } from '../in-memory-game-repository.ts';
import { Game } from '../../../domain/entities/game.ts';
import { Player } from '../../../domain/entities/player.ts';
import { FixedIdGenerator } from '../../../domain/test/support/fixed-id-generator.ts';

describe('InMemoryGameRepository', () => {
  describe('findById', () => {
    it('should find a saved game', async () => {
      // Arrange
      const repository = new InMemoryGameRepository();
      const game = Game.create(
        {
          roomId: 'TestRoomId',
          dilemmas: [{ dilemmaId: 'TestDilemma1', optionIds: ['TestOption'] }],
        },
        new FixedIdGenerator('TestId'),
      );
      await repository.save(game);

      // Act
      const found = await repository.findById('TestId');

      // Assert
      expect(found?.toSnapshot()).toEqual(game.toSnapshot());
    });

    it('should return undefined if the game does not exist', async () => {
      // Arrange
      const repository = new InMemoryGameRepository();

      // Act
      const found = await repository.findById('TestUnknownId');

      // Assert
      expect(found).toBeUndefined();
    });

    it('should not see changes that were not saved', async () => {
      // Arrange
      const repository = new InMemoryGameRepository();
      const game = Game.create(
        {
          roomId: 'TestRoomId',
          dilemmas: [{ dilemmaId: 'TestDilemma1', optionIds: ['TestOption'] }],
        },
        new FixedIdGenerator('TestId'),
      );
      await repository.save(game);

      // Act
      game.startDecisionPhase([
        Player.create({ nickname: 'Ana' }, new FixedIdGenerator('TestAnaId')),
      ]);

      // Assert
      const found = await repository.findById('TestId');
      expect(found?.isInDecisionPhase).toBe(false);
    });
  });
});
