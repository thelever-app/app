import { Dilemma } from '@thelever-app/dilemmas';
import { SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { DilemmaReport } from '@thelever-app/moderation';
import { describeDilemmaReportRepositoryContract } from '@thelever-app/moderation/contracts';
import { describe, expect, it } from 'vitest';
import { PostgresDilemmaRepository } from '../../dilemmas/postgres-dilemma-repository.ts';
import type { Database } from '../../schema.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { PostgresDilemmaReportRepository } from '../postgres-dilemma-report-repository.ts';

const database = useTestDatabase<Database>();

/** A dilemma saved, whose first version reports refer to. */
async function savedDilemma(idGenerator: SequentialIdGenerator) {
  const dilemma = Dilemma.create(
    {
      text: 'TestText',
      options: ['TestPull', 'TestWait'],
      language: 'es',
      category: 'honesty',
      tags: [],
      minimumAge: 16,
      type: 'standard',
      compromising: false,
      scale: 'everyday',
      fixedOrder: false,
    },
    idGenerator,
  );
  await new PostgresDilemmaRepository(database.db()).save(dilemma);
  return { dilemmaId: dilemma.id, version: dilemma.version };
}

describeDilemmaReportRepositoryContract('PostgresDilemmaReportRepository', async () => {
  await emptyTables(database.db());
  const idGenerator = new SequentialIdGenerator('dilemma');
  return {
    repository: new PostgresDilemmaReportRepository(database.db()),
    dilemmas: [await savedDilemma(idGenerator), await savedDilemma(idGenerator)],
  };
});

describe('PostgresDilemmaReportRepository', () => {
  it('should not let a version with reports be deleted, so its reports outlive it', async () => {
    // Arrange
    await emptyTables(database.db());
    const { dilemmaId, version } = await savedDilemma(new SequentialIdGenerator('dilemma'));
    await new PostgresDilemmaReportRepository(database.db()).save(
      DilemmaReport.receive({
        id: 'TestReport',
        dilemmaId,
        version,
        reason: 'offensive',
        comment: null,
        identity: 'TestIdentity',
        reportedAt: new Date('2026-11-21T10:00:00Z'),
      }),
    );

    // Act
    const deleting = database
      .db()
      .deleteFrom('dilemma_versions')
      .where('dilemma_id', '=', dilemmaId)
      .execute();

    // Assert
    await expect(deleting).rejects.toMatchObject({
      constraint: 'dilemma_reports_dilemma_id_version_fkey',
    });
  });
});
