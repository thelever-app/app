/**
 * @thelever-app/moderation
 *
 * The Moderation context: the reports of dilemmas and nicknames, the notices of illegal content,
 * their issues in the moderation repository, the decisions of the team and the moderation notices
 * that tell players about them.
 */
export {
  DilemmaReport,
  type DilemmaReportSnapshot,
  MAXIMUM_COMMENT_LENGTH,
} from './domain/entities/dilemma-report.ts';
export { NicknameReport, type NicknameReportSnapshot } from './domain/entities/nickname-report.ts';
export {
  IllegalContentNotice,
  type IllegalContentNoticeSnapshot,
  MAXIMUM_EXPLANATION_LENGTH,
  MAXIMUM_NAME_LENGTH,
  MAXIMUM_REFERENCE_LENGTH,
} from './domain/entities/illegal-content-notice.ts';
export { Issue, type IssueSnapshot, REPORT_THRESHOLD } from './domain/entities/issue.ts';
export {
  ModerationNotice,
  type ModerationNoticeSnapshot,
  type NoticeSubject,
} from './domain/entities/moderation-notice.ts';
export type { IssueEvent } from './domain/events/issue-event.ts';
export type { Decision, Outcome } from './domain/vos/decision.vo.ts';
export type { IssueContent } from './domain/vos/issue-content.vo.ts';
export { LANGUAGES as MODERATION_LANGUAGES, type Language } from './domain/vos/language.vo.ts';
export {
  DILEMMA_REPORT_REASONS,
  type DilemmaReportReason,
  NICKNAME_REPORT_REASONS,
  type NicknameReportReason,
  type ReportReason,
} from './domain/vos/report-reason.vo.ts';
export type { IdGenerator } from './domain/ports/id-generator.port.ts';
export type { Clock } from './domain/ports/clock.port.ts';
export { CommentTooLongError } from './domain/errors/comment-too-long.error.ts';
export { InvalidEntryError } from './domain/errors/invalid-entry.error.ts';
export { ContentMismatchError } from './domain/errors/content-mismatch.error.ts';
export { IssueAlreadyDecidedError } from './domain/errors/issue-already-decided.error.ts';
export type { IssueRepository } from './application/ports/issue-repository.port.ts';
export type { Outbox, PendingEvent } from './application/ports/outbox.port.ts';
export type { ModerationNoticeRepository } from './application/ports/moderation-notice-repository.port.ts';
export type { ModeratedDilemmas } from './application/ports/moderated-dilemmas.port.ts';
export type { ModeratedNicknames } from './application/ports/moderated-nicknames.port.ts';
export type { IssueTracker, TrackedIssue } from './application/ports/issue-tracker.port.ts';
export type { Email, Mailer } from './application/ports/mailer.port.ts';
export type { FactsTranslator } from './application/ports/facts-translator.port.ts';
export { TooManyNoticesError } from './application/errors/too-many-notices.error.ts';
export { ModerationNoticeNotFoundError } from './application/errors/moderation-notice-not-found.error.ts';
export { CONTACT_EMAIL } from './application/texts/email-texts.ts';
export {
  type ReceiveDilemmaReport,
  type ReceiveDilemmaReportInput,
  ReceiveDilemmaReportUseCase,
} from './application/use-cases/receive-dilemma-report.use-case.ts';
export {
  type ReceiveNicknameReport,
  type ReceiveNicknameReportInput,
  ReceiveNicknameReportUseCase,
} from './application/use-cases/receive-nickname-report.use-case.ts';
export {
  MAXIMUM_NOTICES_PER_DAY,
  type ReceiveIllegalContentNoticeInput,
  ReceiveIllegalContentNoticeUseCase,
} from './application/use-cases/receive-illegal-content-notice.use-case.ts';
export {
  IssueNotFoundError,
  SendIssueEventUseCase,
} from './application/use-cases/send-issue-event.use-case.ts';
export {
  DECISION_LABELS,
  ReadDecisionUseCase,
} from './application/use-cases/read-decision.use-case.ts';
export { GetUndecidedIssuesUseCase } from './application/use-cases/get-undecided-issues.use-case.ts';
export { GetModerationNoticesUseCase } from './application/use-cases/get-moderation-notices.use-case.ts';
export { SeeModerationNoticeUseCase } from './application/use-cases/see-moderation-notice.use-case.ts';
