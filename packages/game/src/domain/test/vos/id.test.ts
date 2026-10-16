import { describe, expect, it } from 'vitest';
import { IdVO } from '../../vos/id.vo.ts';
import { IdMissingError } from '../../errors/id-missing.error.ts';

describe('IdVO', () => {
  describe('constructor', () => {
    it('should create a new IdVO', () => {
      // Arrange
      const id = 'TestId';

      // Act
      const idVO = new IdVO(id);

      // Assert
      expect(idVO).toBeInstanceOf(IdVO);
    });

    it('should set the value correctly', () => {
      // Arrange
      const id = 'TestId';

      // Act
      const idVO = new IdVO(id);

      // Assert
      expect(idVO.value).toBe(id);
    });

    it('should throw an error if the value is empty', () => {
      // Arrange
      const id = '';

      // Act & Assert
      expect(() => new IdVO(id)).toThrow(IdMissingError);
    });
  });
});
