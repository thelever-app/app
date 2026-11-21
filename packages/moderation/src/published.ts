/**
 * @thelever-app/moderation/published
 *
 * The published language of the Moderation context: all another context may use of it (ADR 0001).
 * Plain data and the interface of its command; its domain stays inside.
 */
export type {
  ReceiveDilemmaReport,
  ReceiveDilemmaReportInput,
} from './application/use-cases/receive-dilemma-report.use-case.ts';
export type { ReportReason } from './domain/vos/report-reason.vo.ts';
