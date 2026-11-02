import { describe, expect, it } from 'vitest';
import { MinimumAgeVO } from '../../vos/minimum-age.vo.ts';
import { InvalidMinimumAgeError } from '../../errors/invalid-minimum-age.error.ts';

describe('MinimumAgeVO', () => {
  describe('constructor', () => {
    it('should accept 16 and 18', () => {
      // Act & Assert
      expect(new MinimumAgeVO(16).value).toBe(16);
      expect(new MinimumAgeVO(18).value).toBe(18);
    });

    it('should throw an error for any other age', () => {
      // Act & Assert
      expect(() => new MinimumAgeVO(17)).toThrow(InvalidMinimumAgeError);
    });
  });

  describe('isSuitableForMinors', () => {
    it('should let a player under 18 get a dilemma suitable from 16', () => {
      // Act & Assert
      expect(new MinimumAgeVO(16).isSuitableForMinors()).toBe(true);
    });

    it('should keep a dilemma for adults away from a player under 18', () => {
      // Act & Assert
      expect(new MinimumAgeVO(18).isSuitableForMinors()).toBe(false);
    });
  });
});
