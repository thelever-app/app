import { describe, expect, it } from 'vitest';
import { Player } from '../../entities/player.ts';
import { IdMissingError } from '../../errors/id-missing.error.ts';
import { NicknameMissingError } from '../../errors/nickname-missing.error.ts';

describe('Player', () => {
  describe('constructor', () => {
    it('should create a new player', () => {
      // Arrange
      const id = 'TestId';
      const nickname = 'TestNickName';

      // Act
      const player = new Player(id, nickname);

      // Assert
      expect(player).toBeInstanceOf(Player);
    });

    it('should set the values correctly', () => {
      // Arrange
      const id = 'TestId';
      const nickname = 'TestNickName';

      // Act
      const player = new Player(id, nickname);

      // Assert
      expect(player.id).toBe(id);
      expect(player.nickname).toBe(nickname);
    });

    it('should throw an error if the id is empty', () => {
      // Arrange
      const id = '';
      const nickname = 'TestNickName';

      // Act & Assert
      expect(() => new Player(id, nickname)).toThrow(IdMissingError);
    });

    it('should throw an error if the nickname is empty', () => {
      // Arrange
      const id = 'TestId';
      const nickname = '';

      // Act & Assert
      expect(() => new Player(id, nickname)).toThrow(NicknameMissingError);
    });
  });
});
