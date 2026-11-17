import { describe, expect, it } from 'vitest';
import { InvalidPredictionError } from '../../errors/invalid-prediction.error.ts';
import { InvalidWorldCountError } from '../../errors/invalid-world-count.error.ts';
import { WorldResult } from '../../vos/world-result.vo.ts';

describe('WorldResult', () => {
  describe('constructor', () => {
    it('should reject a count that is not a whole number of answers', () => {
      // Act & Assert
      expect(() => new WorldResult([3, -1])).toThrow(InvalidWorldCountError);
      expect(() => new WorldResult([3, 1.5])).toThrow(InvalidWorldCountError);
    });
  });

  describe('answers', () => {
    it('should add up the answers to every option', () => {
      // Act
      const result = new WorldResult([12, 7, 1]);

      // Assert
      expect(result.answers).toBe(20);
    });
  });

  describe('isShown', () => {
    it('should show the result from 20 answers on, and not below', () => {
      // Act & Assert
      expect(new WorldResult([12, 7]).isShown).toBe(false);
      expect(new WorldResult([12, 8]).isShown).toBe(true);
    });
  });

  describe('percentages', () => {
    it('should give each option its share in whole percentages that add up to 100', () => {
      // Act
      const percentages = new WorldResult([1, 1, 1]).percentages();

      // Assert: 33.3 each, and the point left goes to the first of the largest remainders.
      expect(percentages).toEqual([34, 33, 33]);
    });

    it('should round each share to its nearest whole percentage when they add up to 100', () => {
      // Act
      const percentages = new WorldResult([81, 19]).percentages();

      // Assert
      expect(percentages).toEqual([81, 19]);
    });

    it('should give the points left to the largest remainders', () => {
      // Act: 14.6, 28.1, 57.3
      const percentages = new WorldResult([146, 281, 573]).percentages();

      // Assert
      expect(percentages).toEqual([15, 28, 57]);
    });

    it('should give no option a share while there are no answers', () => {
      // Act
      const percentages = new WorldResult([0, 0]).percentages();

      // Assert
      expect(percentages).toEqual([0, 0]);
    });
  });

  describe('predictionOff', () => {
    it('should say how many points a prediction of the share of an option was off', () => {
      // Arrange: 81 % and 19 %
      const result = new WorldResult([81, 19]);

      // Act & Assert
      expect(result.predictionOff(0, 70)).toBe(11);
      expect(result.predictionOff(1, 30)).toBe(11);
      expect(result.predictionOff(0, 81)).toBe(0);
    });

    it('should reject a prediction that is not a whole percentage from 0 to 100', () => {
      // Arrange
      const result = new WorldResult([81, 19]);

      // Act & Assert
      expect(() => result.predictionOff(0, 101)).toThrow(InvalidPredictionError);
      expect(() => result.predictionOff(0, -5)).toThrow(InvalidPredictionError);
      expect(() => result.predictionOff(0, 50.5)).toThrow(InvalidPredictionError);
    });

    it('should reject an option the dilemma does not have', () => {
      // Act & Assert
      expect(() => new WorldResult([81, 19]).predictionOff(2, 50)).toThrow(RangeError);
    });
  });
});
