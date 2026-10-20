import { describe, expect, it } from 'vitest';
import { InMemoryDilemmaRepository } from '../in-memory-dilemma-repository.ts';
import { Dilemma } from '../../../domain/entities/dilemma.ts';
import { FixedIdGenerator } from '../../../domain/test/support/fixed-id-generator.ts';

function dilemma() {
  return Dilemma.create(
    { text: 'TestDilemmaText', language: 'es', options: ['TestOption1', 'TestOption2'] },
    new FixedIdGenerator('TestDilemmaId', 'TestOptionId1', 'TestOptionId2'),
  );
}

describe('InMemoryDilemmaRepository', () => {
  it('should find a saved dilemma by its id', async () => {
    // Arrange
    const repository = new InMemoryDilemmaRepository();
    await repository.save(dilemma());

    // Act
    const found = await repository.findById('TestDilemmaId');

    // Assert
    expect(found?.toSnapshot()).toEqual(dilemma().toSnapshot());
  });

  it('should return undefined for an unknown id', async () => {
    // Act & Assert
    expect(await new InMemoryDilemmaRepository().findById('TestUnknownId')).toBeUndefined();
  });

  it('should return a copy, not the stored dilemma', async () => {
    // Arrange
    const repository = new InMemoryDilemmaRepository();
    const saved = dilemma();
    await repository.save(saved);

    // Act
    const found = await repository.findById('TestDilemmaId');

    // Assert
    expect(found).not.toBe(saved);
  });
});
