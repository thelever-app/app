import { describe, expect, it } from 'vitest';
import { SequentialIdGenerator } from '../sequential-id-generator.ts';

describe('SequentialIdGenerator', () => {
  describe('generate', () => {
    it('should generate predictable ids in sequence', () => {
      // Arrange
      const idGenerator = new SequentialIdGenerator();

      // Act
      const ids = [idGenerator.generate(), idGenerator.generate()];

      // Assert
      expect(ids).toEqual(['id-1', 'id-2']);
    });
  });
});
