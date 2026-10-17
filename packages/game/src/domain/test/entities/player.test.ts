import { describe, expect, it } from 'vitest';
import { Player } from '../../entities/player.ts';
import { IdMissingError } from '../../errors/id-missing.error.ts';
import { NicknameMissingError } from '../../errors/nickname-missing.error.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';

describe('Player', () => {
  describe('create', () => {
    it('should create a new player', () => {
      // Arrange
      const id = 'TestId';
      const nickname = 'TestNickName';

      // Act
      const player = Player.create({ nickname }, new FixedIdGenerator(id));

      // Assert
      expect(player).toBeInstanceOf(Player);
    });

    it('should set the values correctly', () => {
      // Arrange
      const id = 'TestId';
      const nickname = 'TestNickName';

      // Act
      const player = Player.create({ nickname }, new FixedIdGenerator(id));

      // Assert
      expect(player.id).toBe(id);
      expect(player.nickname).toBe(nickname);
    });

    it('should throw an error if the id is empty', () => {
      // Arrange
      const id = '';
      const nickname = 'TestNickName';

      // Act & Assert
      expect(() => Player.create({ nickname }, new FixedIdGenerator(id))).toThrow(IdMissingError);
    });

    it('should throw an error if the nickname is empty', () => {
      // Arrange
      const id = 'TestId';
      const nickname = '';

      // Act & Assert
      expect(() => Player.create({ nickname }, new FixedIdGenerator(id))).toThrow(
        NicknameMissingError,
      );
    });
  });

  describe('toSnapshot', () => {
    it('should return its id and nickname as plain data', () => {
      // Arrange
      const player = Player.create({ nickname: 'TestNickName' }, new FixedIdGenerator('TestId'));

      // Act
      const snapshot = player.toSnapshot();

      // Assert
      expect(snapshot).toEqual({ id: 'TestId', nickname: 'TestNickName' });
    });
  });

  describe('restore', () => {
    it('should rebuild the player from its snapshot', () => {
      // Arrange
      const snapshot = { id: 'TestId', nickname: 'TestNickName' };

      // Act
      const player = Player.restore(snapshot);

      // Assert
      expect(player.id).toBe('TestId');
      expect(player.nickname).toBe('TestNickName');
    });
  });
});
