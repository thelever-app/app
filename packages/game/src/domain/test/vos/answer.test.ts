import { describe, expect, it } from 'vitest';
import { AnswerVO } from '../../vos/answer.vo.ts';
import { VoteMissingError } from '../../errors/vote-missing.error.ts';

const SEAL = {
  gameConsentVersion: 'TestGameConsentVersion',
  researchConsentVersion: null,
  commercialLicenceConsentVersion: null,
  underEighteen: false,
};

describe('AnswerVO', () => {
  describe('constructor', () => {
    it('should set the vote correctly', () => {
      // Arrange
      const vote = 'TestOption';

      // Act
      const answerVO = new AnswerVO(vote, SEAL, false);

      // Assert
      expect(answerVO.vote).toBe(vote);
    });

    it('should keep its seal and whether the voter was the person in the gap', () => {
      // Act
      const answerVO = new AnswerVO('TestOption', SEAL, true);

      // Assert
      expect(answerVO.seal).toEqual(SEAL);
      expect(answerVO.voterInTheGap).toBe(true);
    });

    it('should not let its seal be changed through the object it was given', () => {
      // Arrange
      const seal = { ...SEAL };
      const answerVO = new AnswerVO('TestOption', seal, false);

      // Act
      seal.underEighteen = true;

      // Assert
      expect(answerVO.seal.underEighteen).toBe(false);
    });

    it('should throw an error if the vote is missing', () => {
      // Arrange
      const vote = '';

      // Act & Assert
      expect(() => new AnswerVO(vote, SEAL, false)).toThrow(VoteMissingError);
    });
  });
});
