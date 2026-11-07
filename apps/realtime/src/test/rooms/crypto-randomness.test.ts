import { describe, expect, it } from 'vitest';
import { CryptoRandomness } from '../../rooms/crypto-randomness.ts';

describe('CryptoRandomness', () => {
  describe('integer', () => {
    it('should give every integer from 0 up to the one before the maximum, and no other', () => {
      // Arrange
      const randomness = new CryptoRandomness();

      // Act
      const seen = new Set(Array.from({ length: 2000 }, () => randomness.integer(5)));

      // Assert
      expect([...seen].sort()).toEqual([0, 1, 2, 3, 4]);
    });

    it('should give 0 when there is only one choice', () => {
      // Act & Assert
      expect(new CryptoRandomness().integer(1)).toBe(0);
    });
  });
});
