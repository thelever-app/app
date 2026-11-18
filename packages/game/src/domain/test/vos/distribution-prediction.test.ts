import { describe, expect, it } from 'vitest';
import { InvalidDistributionPredictionError } from '../../errors/invalid-distribution-prediction.error.ts';
import { OptionNotInDilemmaError } from '../../errors/option-not-in-dilemma.error.ts';
import {
  DistributionPredictionVO,
  type PredictedShare,
} from '../../vos/distribution-prediction.vo.ts';

/** The shares of a prediction over the options TestA, TestB, TestC and TestD, in that order. */
function sharesOf(...values: readonly number[]): PredictedShare[] {
  return values.map((share, index) => ({ optionId: `Test${'ABCD'[index]}`, share }));
}

describe('DistributionPredictionVO', () => {
  describe('constructor', () => {
    it('should keep each share in the order it was given', () => {
      // Act
      const prediction = new DistributionPredictionVO(sharesOf(55, 15, 30));

      // Assert
      expect(prediction.shares).toEqual(sharesOf(55, 15, 30));
      expect(prediction.shareOf('TestC')).toBe(30);
    });

    it.each([
      ['a share that is not a multiple of 5', sharesOf(52, 48)],
      ['shares that do not add up to 100', sharesOf(50, 45)],
      ['a share below 0', sharesOf(105, -5)],
      ['no option', []],
      ['an option twice', [...sharesOf(50), ...sharesOf(50)]],
    ])('should throw an error for %s', (_case, shares) => {
      // Act
      const create = () => new DistributionPredictionVO(shares);

      // Assert
      expect(create).toThrow(InvalidDistributionPredictionError);
    });

    it('should not let its shares be changed through the array it was given', () => {
      // Arrange
      const shares = sharesOf(50, 50);
      const prediction = new DistributionPredictionVO(shares);

      // Act
      shares[0] = { optionId: 'TestA', share: 100 };

      // Assert
      expect(prediction.shareOf('TestA')).toBe(50);
    });
  });

  describe('even', () => {
    it.each([
      [['TestA', 'TestB'], sharesOf(50, 50)],
      [['TestA', 'TestB', 'TestC'], sharesOf(35, 35, 30)],
      [['TestA', 'TestB', 'TestC', 'TestD'], sharesOf(25, 25, 25, 25)],
    ])('should split %j evenly, the 5 %% left over to the first options', (options, shares) => {
      // Act
      const prediction = DistributionPredictionVO.even(options);

      // Assert
      expect(prediction.shares).toEqual(shares);
    });

    it('should follow the order the player sees the options in', () => {
      // Act
      const prediction = DistributionPredictionVO.even(['TestC', 'TestA', 'TestB']);

      // Assert
      expect(prediction.shares.map(({ optionId }) => optionId)).toEqual([
        'TestC',
        'TestA',
        'TestB',
      ]);
      expect(prediction.shareOf('TestC')).toBe(35);
      expect(prediction.shareOf('TestB')).toBe(30);
    });
  });

  describe('withShare', () => {
    it('should adjust the other options in proportion, in steps of 5 %', () => {
      // Arrange
      const prediction = new DistributionPredictionVO(sharesOf(40, 30, 20, 10));

      // Act
      const moved = prediction.withShare('TestA', 60);

      // Assert
      expect(moved.shares).toEqual(sharesOf(60, 20, 15, 5));
    });

    it('should set the other option of two to what is left', () => {
      // Arrange
      const prediction = new DistributionPredictionVO(sharesOf(50, 50));

      // Act
      const moved = prediction.withShare('TestB', 85);

      // Assert
      expect(moved.shares).toEqual(sharesOf(15, 85));
    });

    it('should share what is left evenly among options that had nothing', () => {
      // Arrange
      const prediction = new DistributionPredictionVO(sharesOf(100, 0, 0));

      // Act
      const moved = prediction.withShare('TestA', 70);

      // Assert
      expect(moved.shares).toEqual(sharesOf(70, 15, 15));
    });

    it('should round the share it is given to a step of 5 % between 0 and 100', () => {
      // Arrange
      const prediction = new DistributionPredictionVO(sharesOf(50, 50));

      // Act
      const rounded = prediction.withShare('TestA', 63);
      const capped = prediction.withShare('TestA', 140);

      // Assert
      expect(rounded.shares).toEqual(sharesOf(65, 35));
      expect(capped.shares).toEqual(sharesOf(100, 0));
    });

    it('should always give multiples of 5 that add up to 100', () => {
      // Arrange
      let prediction = DistributionPredictionVO.even(['TestA', 'TestB', 'TestC', 'TestD']);

      // Act
      for (const [optionId, share] of [
        ['TestB', 35],
        ['TestD', 5],
        ['TestA', 90],
        ['TestC', 45],
        ['TestB', 0],
      ] as const) {
        prediction = prediction.withShare(optionId, share);

        // Assert
        expect(prediction.shares.every(({ share: each }) => each % 5 === 0)).toBe(true);
        expect(prediction.shares.reduce((total, each) => total + each.share, 0)).toBe(100);
        expect(prediction.shareOf(optionId)).toBe(share);
      }
    });

    it('should throw an error for an option it does not have', () => {
      // Arrange
      const prediction = new DistributionPredictionVO(sharesOf(50, 50));

      // Act
      const move = () => prediction.withShare('TestZ', 20);

      // Assert
      expect(move).toThrow(OptionNotInDilemmaError);
    });
  });

  describe('coversExactly', () => {
    it('should say whether it has a share for each option and no other', () => {
      // Arrange
      const prediction = new DistributionPredictionVO(sharesOf(50, 50));

      // Act and Assert
      expect(prediction.coversExactly(['TestB', 'TestA'])).toBe(true);
      expect(prediction.coversExactly(['TestA', 'TestB', 'TestC'])).toBe(false);
      expect(prediction.coversExactly(['TestA', 'TestC'])).toBe(false);
    });
  });
});
