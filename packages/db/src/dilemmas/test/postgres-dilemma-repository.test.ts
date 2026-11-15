import {
  Dilemma,
  FindDilemmaIdsUseCase,
  GetDilemmasUseCase,
  SearchDilemmasUseCase,
} from '@thelever-app/dilemmas';
import {
  describeDilemmaQueriesContract,
  describeDilemmaRepositoryContract,
} from '@thelever-app/dilemmas/contracts';
import { SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { CONTRACT_DILEMMAS, describeDilemmaCatalogContract } from '@thelever-app/game/contracts';
import { PublishedDilemmasCatalog } from '@thelever-app/integrations/game';
import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';
import type { Database } from '../../schema.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { PostgresDilemmaQueries } from '../postgres-dilemma-queries.ts';
import { PostgresDilemmaRepository } from '../postgres-dilemma-repository.ts';

const database = useTestDatabase<Database>();

describeDilemmaRepositoryContract('PostgresDilemmaRepository', async () => {
  await emptyTables(database.db());
  return new PostgresDilemmaRepository(database.db());
});

describeDilemmaQueriesContract('PostgresDilemmaQueries', async () => {
  await emptyTables(database.db());
  return {
    repository: new PostgresDilemmaRepository(database.db()),
    queries: new PostgresDilemmaQueries(database.db()),
  };
});

describeDilemmaCatalogContract('PublishedDilemmasCatalog on PostgreSQL', async () => {
  await emptyTables(database.db());
  const repository = new PostgresDilemmaRepository(database.db());
  const queries = new PostgresDilemmaQueries(database.db());
  const idGenerator = new SequentialIdGenerator('dilemma');
  const stored = [];
  for (const { status, translations, ...content } of CONTRACT_DILEMMAS) {
    const created = Dilemma.create({ ...content, language: 'es' }, idGenerator).toSnapshot();
    const original = Dilemma.restore({ ...created, version: { ...created.version, status } });
    await repository.save(original);
    for (const { language, text, options } of translations) {
      await repository.save(
        Dilemma.translate(original, { language, text, options, tags: [] }, idGenerator),
      );
    }
    stored.push({
      dilemmaId: original.id,
      text: original.text,
      options: original.options.map(({ id, text }) => ({ optionId: id, text })),
      language: original.language,
    });
  }
  const catalog = new PublishedDilemmasCatalog(
    new GetDilemmasUseCase(repository),
    new SearchDilemmasUseCase(queries),
    new FindDilemmaIdsUseCase(queries),
  );
  return { catalog, stored };
});

describe('dilemma_versions', () => {
  it('should refuse to change what a version says, even outside the repository', async () => {
    // Arrange
    await emptyTables(database.db());
    await new PostgresDilemmaRepository(database.db()).save(
      Dilemma.create(
        {
          text: 'TestDilemmaText',
          options: ['TestOption1', 'TestOption2'],
          language: 'es',
          category: 'honesty',
          tags: ['testtag'],
          minimumAge: 16,
        },
        new SequentialIdGenerator('dilemma'),
      ),
    );

    // Act & Assert
    await expect(
      sql`update dilemma_versions set text = 'TestOtherText'`.execute(database.db()),
    ).rejects.toThrow('the content of a version of a dilemma never changes');
    await expect(
      sql`update dilemma_version_tags set tag = 'testothertag'`.execute(database.db()),
    ).rejects.toThrow('never change');
    await expect(
      sql`update dilemma_versions set status = 'withdrawn'`.execute(database.db()),
    ).resolves.toBeDefined();
  });
});
