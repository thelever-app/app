import { describe, expect, it } from 'vitest';
import { Dilemma } from '../../domain/entities/dilemma.ts';
import { InMemoryDilemmaRepository } from '../../adapters/in-memory/in-memory-dilemma-repository.ts';
import { loadSeedDilemmas, SEED_DILEMMAS } from '../seed-dilemmas.ts';

describe('SEED_DILEMMAS', () => {
  it('should hold only valid dilemmas', () => {
    // Act & Assert
    for (const snapshot of SEED_DILEMMAS) {
      expect(() => Dilemma.restore(snapshot)).not.toThrow();
    }
  });

  it('should give every dilemma and every option an id of its own', () => {
    // Arrange
    const ids = SEED_DILEMMAS.flatMap(({ id, options }) => [id, ...options.map((o) => o.id)]);

    // Assert
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('loadSeedDilemmas', () => {
  it('should save every seed dilemma and return their ids in order', async () => {
    // Arrange
    const repository = new InMemoryDilemmaRepository();

    // Act
    const ids = await loadSeedDilemmas(repository);

    // Assert
    expect(ids).toEqual(SEED_DILEMMAS.map(({ id }) => id));
    for (const snapshot of SEED_DILEMMAS) {
      expect((await repository.findById(snapshot.id))?.toSnapshot()).toEqual(snapshot);
    }
  });
});
