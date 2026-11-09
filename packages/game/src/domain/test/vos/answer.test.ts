import { describe, expect, it } from 'vitest';
import { AnswerVO, type AnswerProps } from '../../vos/answer.vo.ts';
import { VoteMissingError } from '../../errors/vote-missing.error.ts';

const SEAL = {
  gameConsentVersion: 'TestGameConsentVersion',
  researchConsentVersion: null,
  commercialLicenceConsentVersion: null,
  underEighteen: false,
};
const PROPS: AnswerProps = {
  vote: 'TestOption',
  votePredictions: [{ playerId: 'TestAnaId', vote: 'TestOtherOption' }],
  optionOrder: ['TestOtherOption', 'TestOption'],
  responseTimeMs: null,
  seal: SEAL,
  voterInTheGap: false,
};

describe('AnswerVO', () => {
  describe('constructor', () => {
    it('should keep the vote, the predictions and what is recorded with them', () => {
      // Act
      const answerVO = new AnswerVO({ ...PROPS, voterInTheGap: true });

      // Assert
      expect(answerVO.vote).toBe('TestOption');
      expect(answerVO.votePredictions).toEqual(PROPS.votePredictions);
      expect(answerVO.optionOrder).toEqual(PROPS.optionOrder);
      expect(answerVO.responseTimeMs).toBeNull();
      expect(answerVO.seal).toEqual(SEAL);
      expect(answerVO.voterInTheGap).toBe(true);
    });

    it('should trim the vote and the predicted votes', () => {
      // Act
      const answerVO = new AnswerVO({
        ...PROPS,
        vote: ' TestOption ',
        votePredictions: [{ playerId: 'TestAnaId', vote: ' TestOtherOption ' }],
      });

      // Assert
      expect(answerVO.vote).toBe('TestOption');
      expect(answerVO.votePredictions[0]?.vote).toBe('TestOtherOption');
    });

    it('should not let its seal be changed through the object it was given', () => {
      // Arrange
      const seal = { ...SEAL };
      const answerVO = new AnswerVO({ ...PROPS, seal });

      // Act
      seal.underEighteen = true;

      // Assert
      expect(answerVO.seal.underEighteen).toBe(false);
    });

    it('should throw an error if the vote is missing', () => {
      // Act & Assert
      expect(() => new AnswerVO({ ...PROPS, vote: '' })).toThrow(VoteMissingError);
    });

    it('should throw an error if a predicted vote is missing', () => {
      // Act & Assert
      expect(
        () => new AnswerVO({ ...PROPS, votePredictions: [{ playerId: 'TestAnaId', vote: ' ' }] }),
      ).toThrow(VoteMissingError);
    });
  });

  describe('completedIn', () => {
    it('should give the same answer with the time it took to complete it', () => {
      // Act
      const completed = new AnswerVO(PROPS).completedIn(40_000);

      // Assert
      expect(completed.toProps()).toEqual({ ...PROPS, responseTimeMs: 40_000 });
    });
  });
});
