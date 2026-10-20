import { describe, expect, it } from 'vitest';
import { SequentialIdGenerator } from '../sequential-id-generator.ts';

describe('SequentialIdGenerator', () => {
  it('should hand out numbered ids with its prefix', () => {
    // Arrange
    const generator = new SequentialIdGenerator('dilemma');

    // Act & Assert
    expect([generator.generate(), generator.generate()]).toEqual(['dilemma-1', 'dilemma-2']);
  });
});
