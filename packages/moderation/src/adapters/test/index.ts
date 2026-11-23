/**
 * @thelever-app/moderation/contracts
 *
 * The tests every adapter of the Moderation ports must pass, in memory or in PostgreSQL. Only for
 * tests.
 */
export {
  describeIssueRepositoryContract,
  type IssueRepositorySubject,
  type ReportableDilemma,
} from './issue-repository.contract.ts';
export { describeOutboxContract, type OutboxSubject } from './outbox.contract.ts';
export { describeModerationNoticeRepositoryContract } from './moderation-notice-repository.contract.ts';
