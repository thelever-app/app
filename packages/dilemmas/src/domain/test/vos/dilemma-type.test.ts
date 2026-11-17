import { describe, expect, it } from 'vitest';
import { DILEMMA_TYPES, DilemmaTypeVO } from '../../vos/dilemma-type.vo.ts';
import { UnknownDilemmaTypeError } from '../../errors/unknown-dilemma-type.error.ts';

describe('DilemmaTypeVO', () => {
  describe('constructor', () => {
    it('should accept the standard, game theory and would-you-rather types', () => {
      // Act & Assert
      expect(DILEMMA_TYPES).toEqual(['standard', 'game-theory', 'would-you-rather']);
      for (const type of DILEMMA_TYPES) {
        expect(new DilemmaTypeVO(type).value).toBe(type);
      }
    });

    it('should throw an error if the type is not in the list', () => {
      // Act & Assert
      expect(() => new DilemmaTypeVO('teoría de juegos')).toThrow(UnknownDilemmaTypeError);
    });
  });
});
