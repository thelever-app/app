import { describe, expect, it } from 'vitest';
import { Dilemma } from '../../domain/entities/dilemma.ts';
import { InMemoryDilemmaRepository } from '../../adapters/in-memory/in-memory-dilemma-repository.ts';
import { loadSeedDilemmas, SEED_DILEMMAS } from '../seed-dilemmas.ts';

const [WALLET] = SEED_DILEMMAS.filter(({ id }) => id === 'seed-wallet');

/** A repository with an earlier version of the wallet dilemma: another text and only its first two options. */
async function repositoryWithAnEarlierWallet() {
  const repository = new InMemoryDilemmaRepository();
  const { id, language, category, tags, minimumAge, options } = WALLET!;
  await repository.save(
    Dilemma.restore({
      id,
      language,
      creator: { type: 'curation-team' },
      visibility: 'public',
      version: {
        number: 1,
        text: 'TestEarlierText',
        options: options.slice(0, 2),
        category,
        tags,
        minimumAge,
        status: 'in-catalog',
      },
    }),
  );
  return repository;
}

describe('SEED_DILEMMAS', () => {
  it('should hold only valid dilemmas', async () => {
    // Act & Assert
    await expect(loadSeedDilemmas(new InMemoryDilemmaRepository())).resolves.toHaveLength(
      SEED_DILEMMAS.length,
    );
  });

  it('should give every dilemma and every option an id of its own', () => {
    // Arrange
    const ids = SEED_DILEMMAS.flatMap(({ id, options }) => [id, ...options.map((o) => o.id)]);

    // Assert
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('loadSeedDilemmas', () => {
  it('should save every seed dilemma, by the curation team and in the catalog, and return their ids in order', async () => {
    // Arrange
    const repository = new InMemoryDilemmaRepository();

    // Act
    const ids = await loadSeedDilemmas(repository);

    // Assert
    expect(ids).toEqual(SEED_DILEMMAS.map(({ id }) => id));
    for (const { id, language, ...content } of SEED_DILEMMAS) {
      expect((await repository.findById(id))?.toSnapshot()).toEqual({
        id,
        language,
        creator: { type: 'curation-team' },
        visibility: 'public',
        version: { number: 1, ...content, status: 'in-catalog' },
      });
    }
  });

  it('should change nothing when it loads the same seed again', async () => {
    // Arrange
    const repository = new InMemoryDilemmaRepository();
    await loadSeedDilemmas(repository);

    // Act
    await loadSeedDilemmas(repository);

    // Assert
    for (const { id } of SEED_DILEMMAS) {
      expect((await repository.findById(id))?.version).toBe(1);
    }
  });

  it('should create a new version of a seed dilemma that changed, and keep the earlier one', async () => {
    // Arrange
    const repository = await repositoryWithAnEarlierWallet();

    // Act
    await loadSeedDilemmas(repository);

    // Assert
    const current = await repository.findById('seed-wallet');
    expect(current?.version).toBe(2);
    expect(current?.text).toBe(WALLET?.text);
    expect((await repository.findVersion('seed-wallet', 1))?.text).toBe('TestEarlierText');
  });

  it('should keep the ids of the options it already had and give the seed ids to the new ones', async () => {
    // Arrange
    const repository = await repositoryWithAnEarlierWallet();

    // Act
    await loadSeedDilemmas(repository);

    // Assert
    expect((await repository.findById('seed-wallet'))?.options).toEqual(WALLET?.options);
  });
});
