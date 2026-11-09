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

    it('should throw an error if the value is only whitespace', () => {
      // Act & Assert
      expect(() => new NicknameVO('   ')).toThrow(NicknameMissingError);
    });

    it('should trim the value', () => {
      // Arrange & Act
      const vo = new NicknameVO('  Ana  ');

      // Assert
      expect(vo.value).toBe('Ana');
    });
  });

  describe('sameAs', () => {
    it.each([
      ['Ana', 'Ana'],
      ['Ana', 'ana'],
      ['Ana', 'Aná'],
      ['José', 'JOSE'],
      ['Ana', '  ana '],
    ])('should take %s and %s for the same nickname', (one, other) => {
      // Act & Assert
      expect(new NicknameVO(one).sameAs(new NicknameVO(other))).toBe(true);
    });

    it.each([
      ['Ana', 'Anna'],
      ['Ana', 'Ana María'],
      ['Luis', 'Lu'],
    ])('should tell %s from %s', (one, other) => {
      // Act & Assert
      expect(new NicknameVO(one).sameAs(new NicknameVO(other))).toBe(false);
    });
  });
});
