import { describe, expect, it } from 'vitest';
import { NicknameVO } from '../../vos/nickname.vo.ts';
import { NicknameMissingError } from '../../errors/nickname-missing.error.ts';

describe('NicknameVO', () => {
  describe('constructor', () => {
    it('should create a new NicknameVO', () => {
      // Arrange
      const nickname = 'TestNickName';

      // Act
      const nicknameVO = new NicknameVO(nickname);

      // Assert
      expect(nicknameVO).toBeInstanceOf(NicknameVO);
    });

    it('should throw an error if the nickname is empty', () => {
      // Arrange
      const nickname = '';

      // Act & Assert
      expect(() => new NicknameVO(nickname)).toThrow(NicknameMissingError);
    });
  });
});
