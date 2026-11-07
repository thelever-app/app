import { describe, expect, it } from 'vitest';
import { Player } from '../../entities/player.ts';
import { IdMissingError } from '../../errors/id-missing.error.ts';
import { NicknameMissingError } from '../../errors/nickname-missing.error.ts';
import { InvalidAvatarError } from '../../errors/invalid-avatar.error.ts';
import { AvatarVO } from '../../vos/avatar.vo.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';

const AVATAR = new AvatarVO('face-01', 'khaki');

describe('Player', () => {
  describe('identity', () => {
    it('should keep the identity it was created with', () => {
      // Act
      const player = Player.create(
        { nickname: 'Luis', identity: 'TestLuisIdentity', avatar: AVATAR },
        new FixedIdGenerator('TestId'),
      );

      // Assert
      expect(player.identity).toBe('TestLuisIdentity');
    });

    it('should throw an error if the identity is empty', () => {
      // Act & Assert
      expect(() =>
        Player.create(
          { nickname: 'Luis', identity: '', avatar: AVATAR },
          new FixedIdGenerator('TestId'),
        ),
      ).toThrow(IdMissingError);
    });
  });

  describe('create', () => {
    it('should create a new player', () => {
      // Arrange
      const id = 'TestId';
      const nickname = 'TestNickName';

      // Act
      const player = Player.create(
        { nickname, identity: `Test${nickname}Identity`, avatar: AVATAR },
        new FixedIdGenerator(id),
      );

      // Assert
      expect(player).toBeInstanceOf(Player);
    });

    it('should set the values correctly', () => {
      // Arrange
      const id = 'TestId';
      const nickname = 'TestNickName';

      // Act
      const player = Player.create(
        { nickname, identity: `Test${nickname}Identity`, avatar: AVATAR },
        new FixedIdGenerator(id),
      );

      // Assert
      expect(player.id).toBe(id);
      expect(player.nickname).toBe(nickname);
    });

    it('should throw an error if the id is empty', () => {
      // Arrange
      const id = '';
      const nickname = 'TestNickName';

      // Act & Assert
      expect(() =>
        Player.create(
          { nickname, identity: `Test${nickname}Identity`, avatar: AVATAR },
          new FixedIdGenerator(id),
        ),
      ).toThrow(IdMissingError);
    });

    it('should throw an error if the nickname is empty', () => {
      // Arrange
      const id = 'TestId';
      const nickname = '';

      // Act & Assert
      expect(() =>
        Player.create(
          { nickname, identity: `Test${nickname}Identity`, avatar: AVATAR },
          new FixedIdGenerator(id),
        ),
      ).toThrow(NicknameMissingError);
    });
  });

  describe('toSnapshot', () => {
    it('should return its id and nickname as plain data', () => {
      // Arrange
      const player = Player.create(
        { nickname: 'TestNickName', identity: 'TestTestNickNameIdentity', avatar: AVATAR },
        new FixedIdGenerator('TestId'),
      );

      // Act
      const snapshot = player.toSnapshot();

      // Assert
      expect(snapshot).toEqual({
        id: 'TestId',
        nickname: 'TestNickName',
        identity: 'TestTestNickNameIdentity',
        avatar: { face: 'face-01', color: 'khaki' },
      });
    });
  });

  describe('wear', () => {
    it('should change the avatar of the player', () => {
      // Arrange
      const player = Player.create(
        { nickname: 'Luis', identity: 'TestLuisIdentity', avatar: AVATAR },
        new FixedIdGenerator('TestId'),
      );
      const avatar = new AvatarVO('face-07', 'rust');

      // Act
      player.wear(avatar);

      // Assert
      expect(player.avatar).toBe(avatar);
    });
  });

  describe('restore', () => {
    it('should rebuild the player from its snapshot', () => {
      // Arrange
      const snapshot = {
        id: 'TestId',
        nickname: 'TestNickName',
        identity: 'TestTestNickNameIdentity',
        avatar: { face: 'face-05', color: 'olive' },
      };

      // Act
      const player = Player.restore(snapshot);

      // Assert
      expect(player.id).toBe('TestId');
      expect(player.nickname).toBe('TestNickName');
      expect(player.avatar).toEqual(new AvatarVO('face-05', 'olive'));
    });

    it('should throw an error for an avatar that does not exist', () => {
      // Arrange
      const snapshot = {
        id: 'TestId',
        nickname: 'TestNickName',
        identity: 'TestTestNickNameIdentity',
        avatar: { face: 'rocket_launch', color: 'olive' },
      };

      // Act & Assert
      expect(() => Player.restore(snapshot)).toThrow(InvalidAvatarError);
    });
  });
});
