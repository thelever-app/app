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

describe('PostgresIssueRepository', () => {
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
