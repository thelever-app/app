import { describe, expect, it } from 'vitest';
import { VoteVO } from '../../vos/vote.vo.ts';
import { VoteMissingError } from '../../errors/vote-missing.error.ts';

describe('VoteVO', () => {
  describe('constructor', () => {
    it('should set the value correctly', () => {
      // Arrange
      const option = 'TestOption';

      // Act
      const voteVO = new VoteVO(option);

      // Assert
      expect(voteVO.value).toBe(option);
    });

    it('should throw an error if the value is empty', () => {
      // Arrange
      const option = '';

      // Act & Assert
      expect(() => new VoteVO(option)).toThrow(VoteMissingError);
    });
  });
});
