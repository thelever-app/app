import { Dilemma, GetDilemmasUseCase } from '@thelever-app/dilemmas';
import { describeDilemmaRepositoryContract } from '@thelever-app/dilemmas/contracts';
import { SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { CONTRACT_DILEMMAS, describeDilemmaCatalogContract } from '@thelever-app/game/contracts';
import { DilemmasContextCatalog } from '@thelever-app/game/dilemmas';
import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';
import type { Database } from '../../schema.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { PostgresDilemmaRepository } from '../postgres-dilemma-repository.ts';

const database = useTestDatabase<Database>();

describeDilemmaRepositoryContract('PostgresDilemmaRepository', async () => {
  await emptyTables(database.db());
  return new PostgresDilemmaRepository(database.db());
});

describeDilemmaCatalogContract('DilemmasContextCatalog on PostgreSQL', async () => {
  await emptyTables(database.db());
  const repository = new PostgresDilemmaRepository(database.db());
  const idGenerator = new SequentialIdGenerator('dilemma');
  const dilemmas = CONTRACT_DILEMMAS.map(({ text, options }) =>
    Dilemma.create(
      { text, options, language: 'es', category: 'honesty', tags: [], minimumAge: 16 },
      idGenerator,
    ),
  );
  for (const dilemma of dilemmas) await repository.save(dilemma);
  const stored = dilemmas.map((dilemma) => ({
    dilemmaId: dilemma.id,
    text: dilemma.text,
    options: dilemma.options.map(({ id, text }) => ({ optionId: id, text })),
  }));
  return { catalog: new DilemmasContextCatalog(new GetDilemmasUseCase(repository)), stored };
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
