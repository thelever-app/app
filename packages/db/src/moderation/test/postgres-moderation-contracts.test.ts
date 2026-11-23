import { Dilemma } from '@thelever-app/dilemmas';
import { SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { DilemmaReport, IllegalContentNotice, Issue } from '@thelever-app/moderation';
import {
  describeIssueRepositoryContract,
  describeModerationNoticeRepositoryContract,
  describeOutboxContract,
} from '@thelever-app/moderation/contracts';
import { describe, expect, it } from 'vitest';
import { PostgresDilemmaRepository } from '../../dilemmas/postgres-dilemma-repository.ts';
import type { Database } from '../../schema.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { PostgresIssueRepository } from '../postgres-issue-repository.ts';
import { PostgresModerationNoticeRepository } from '../postgres-moderation-notice-repository.ts';
import { PostgresOutbox } from '../postgres-outbox.ts';
import { inTransaction } from '../../transaction.ts';

const database = useTestDatabase<Database>();
const AT = new Date('2026-11-21T10:00:00Z');

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

function noticeOf(id: string) {
  return IllegalContentNotice.receive({
    id,
    reference: 'TestReference',
    explanation: 'TestExplanation',
    name: null,
    email: null,
    language: 'es',
    identity: 'TestNotifier',
    sentAt: AT,
    goodFaith: true,
  });
}

describeIssueRepositoryContract('PostgresIssueRepository', async () => {
  await emptyTables(database.db());
  const idGenerator = new SequentialIdGenerator('dilemma');
  return {
    repository: new PostgresIssueRepository(database.db()),
    dilemmas: [await savedDilemma(idGenerator), await savedDilemma(idGenerator)],
  };
});

describeOutboxContract('PostgresOutbox', async () => {
  await emptyTables(database.db());
  const issues = new PostgresIssueRepository(database.db());
  for (const id of ['TestIssue1', 'TestIssue2']) {
    await issues.save(
      Issue.openWith(
        id,
        { kind: 'reference', reference: 'TestReference' },
        noticeOf(`${id}Notice`),
        AT,
      ),
    );
  }
  return { outbox: new PostgresOutbox(database.db()), issueIds: ['TestIssue1', 'TestIssue2'] };
});

describeModerationNoticeRepositoryContract('PostgresModerationNoticeRepository', async () => {
  await emptyTables(database.db());
  return new PostgresModerationNoticeRepository(database.db());
});

function reportOf(id: string, dilemma: { dilemmaId: string; version: number }) {
  return DilemmaReport.receive({
    id,
    dilemmaId: dilemma.dilemmaId,
    version: dilemma.version,
    reason: 'offensive',
    comment: null,
    language: 'es',
    identity: `${id}Identity`,
    reportedAt: AT,
  });
}

describe('PostgresIssueRepository', () => {
  it('should keep, saving an issue read before, what another command saved since', async () => {
    // Arrange
    await emptyTables(database.db());
    const dilemma = await savedDilemma(new SequentialIdGenerator('dilemma'));
    const repository = new PostgresIssueRepository(database.db());
    const content = { kind: 'dilemma', dilemmaId: dilemma.dilemmaId } as const;
    const issue = Issue.openWith('TestIssue', content, reportOf('TestReport1', dilemma), AT);
    issue.receive(reportOf('TestReport2', dilemma));
    await repository.save(issue);
    const byTheJob = (await repository.findById('TestIssue'))!;
    const byAReport = (await repository.findById('TestIssue'))!;
    byAReport.receive(reportOf('TestReport3', dilemma));
    await repository.save(byAReport);

    // Act
    byTheJob.numbered(7);
    await repository.save(byTheJob);

    // Assert
    const saved = (await repository.findById('TestIssue'))!;
    expect(saved.number).toBe(7);
    expect(saved.hidden).toBe(true);
    expect(saved.reporters()).toHaveLength(3);
  });

  it('should make the report of a content wait for the one that is opening its issue', async () => {
    // Arrange
    await emptyTables(database.db());
    const dilemma = await savedDilemma(new SequentialIdGenerator('dilemma'));
    const repository = new PostgresIssueRepository(database.db());
    const content = { kind: 'dilemma', dilemmaId: dilemma.dilemmaId } as const;
    let looked!: () => void;
    const firstLooked = new Promise<void>((resolve) => (looked = resolve));
    const first = inTransaction(database.db(), async () => {
      await repository.undecidedOf(content);
      looked();
      await new Promise((resolve) => setTimeout(resolve, 200));
      await repository.save(
        Issue.openWith('TestIssue', content, reportOf('TestReport1', dilemma), AT),
      );
    });
    await firstLooked;

    // Act
    const second = await inTransaction(database.db(), () => repository.undecidedOf(content));

    // Assert
    await first;
    expect(second?.id).toBe('TestIssue');
  });

  it('should not let a version with reports be deleted, so its reports outlive it', async () => {
    // Arrange
    await emptyTables(database.db());
    const dilemma = await savedDilemma(new SequentialIdGenerator('dilemma'));
    await new PostgresIssueRepository(database.db()).save(
      Issue.openWith(
        'TestIssue',
        { kind: 'dilemma', dilemmaId: dilemma.dilemmaId },
        DilemmaReport.receive({
          id: 'TestReport',
          dilemmaId: dilemma.dilemmaId,
          version: dilemma.version,
          reason: 'offensive',
          comment: null,
          language: 'es',
          identity: 'TestIdentity',
          reportedAt: AT,
        }),
        AT,
      ),
    );

    // Act & Assert
    await expect(
      database
        .db()
        .deleteFrom('dilemma_versions')
        .where('dilemma_id', '=', dilemma.dilemmaId)
        .execute(),
    ).rejects.toThrow();
  });
});
