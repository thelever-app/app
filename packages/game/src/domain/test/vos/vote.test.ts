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

    it('should throw an error if the value is only whitespace', () => {
      // Act & Assert
      expect(() => new VoteVO('   ')).toThrow(VoteMissingError);
    });

    it('should trim the value', () => {
      // Arrange & Act
      const vo = new VoteVO('  TestOption  ');

      // Assert
      expect(vo.value).toBe('TestOption');
    });
  });
});
