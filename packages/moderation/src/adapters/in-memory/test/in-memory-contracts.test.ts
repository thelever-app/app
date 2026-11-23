import { InMemoryIssueRepository } from '../in-memory-issue-repository.ts';
import { InMemoryModerationNoticeRepository } from '../in-memory-moderation-notice-repository.ts';
import { InMemoryOutbox } from '../in-memory-outbox.ts';
import { describeIssueRepositoryContract } from '../../test/issue-repository.contract.ts';
import { describeModerationNoticeRepositoryContract } from '../../test/moderation-notice-repository.contract.ts';
import { describeOutboxContract } from '../../test/outbox.contract.ts';

describeIssueRepositoryContract('InMemoryIssueRepository', async () => ({
  repository: new InMemoryIssueRepository(),
  dilemmas: [
    { dilemmaId: 'TestDilemma', version: 1 },
    { dilemmaId: 'TestOther', version: 2 },
  ],
}));

describeOutboxContract('InMemoryOutbox', async () => ({
  outbox: new InMemoryOutbox(),
  issueIds: ['TestIssue1', 'TestIssue2'],
}));

describeModerationNoticeRepositoryContract(
  'InMemoryModerationNoticeRepository',
  async () => new InMemoryModerationNoticeRepository(),
);
