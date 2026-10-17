import { describe, expect, it } from 'vitest';
import { AnswerVO } from '../../vos/answer.vo.ts';
import { VoteMissingError } from '../../errors/vote-missing.error.ts';

describe('AnswerVO', () => {
  describe('constructor', () => {
    it('should set the vote correctly', () => {
      // Arrange
      const vote = 'TestOption';

      // Act
      const answerVO = new AnswerVO(vote);

      // Assert
      expect(answerVO.vote).toBe(vote);
    });

    it('should throw an error if the vote is missing', () => {
      // Arrange
      const vote = '';

      // Act & Assert
      expect(() => new AnswerVO(vote)).toThrow(VoteMissingError);
    });
  });
});
