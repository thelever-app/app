/**
 * @thelever-app/moderation
 *
 * The Moderation context: for now, the reports players make of dilemmas, which it keeps for the
 * curation team. The report threshold, the decisions and the moderation repository come with the
 * moderation of reports and notices.
 */
export {
  DilemmaReport,
  type DilemmaReportSnapshot,
  MAXIMUM_COMMENT_LENGTH,
} from './domain/entities/dilemma-report.ts';
export { REPORT_REASONS, type ReportReason } from './domain/vos/report-reason.vo.ts';
export type { IdGenerator } from './domain/ports/id-generator.port.ts';
export { CommentTooLongError } from './domain/errors/comment-too-long.error.ts';
export type { DilemmaReportRepository } from './application/ports/dilemma-report-repository.port.ts';
export {
  type ReceiveDilemmaReport,
  type ReceiveDilemmaReportInput,
  ReceiveDilemmaReportUseCase,
} from './application/use-cases/receive-dilemma-report.use-case.ts';
