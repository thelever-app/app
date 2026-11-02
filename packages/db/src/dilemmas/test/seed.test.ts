import { loadSeedDilemmas, SEED_DILEMMAS } from '@thelever-app/dilemmas/seed';
import { describe, expect, it } from 'vitest';
import type { Database } from '../../schema.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { PostgresDilemmaRepository } from '../postgres-dilemma-repository.ts';

const database = useTestDatabase<Database>();

describe('loadSeedDilemmas on PostgreSQL', () => {
  it('should leave the same rows when it loads the seed twice', async () => {
    // Arrange
    await emptyTables(database.db());
    const repository = new PostgresDilemmaRepository(database.db());
    await loadSeedDilemmas(repository);

    // Act
    await loadSeedDilemmas(repository);

    // Assert
    const versions = await database
      .db()
      .selectFrom('dilemma_versions')
      .select(['dilemma_id', 'number'])
      .orderBy('dilemma_id')
      .execute();
    expect(versions).toEqual(
      SEED_DILEMMAS.map(({ id }) => ({ dilemma_id: id, number: 1 })).sort((a, b) =>
        a.dilemma_id.localeCompare(b.dilemma_id),
      ),
    );
    for (const { id, ...seed } of SEED_DILEMMAS) {
      const found = await repository.findById(id);
      expect(found?.options).toEqual(seed.options);
      expect(found?.tags).toEqual(seed.tags);
    }
  });
});
