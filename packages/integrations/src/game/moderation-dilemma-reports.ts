import type { DilemmaReport, DilemmaReports, ReportReason } from '@thelever-app/game';
import type { DilemmaReportReason, ReceiveDilemmaReport } from '@thelever-app/moderation/published';

/** Each reason of Game as Moderation names it. */
const MODERATION_REASONS: Readonly<Record<ReportReason, DilemmaReportReason>> = {
  offensive: 'offensive',
  confusing: 'confusing',
  mistranslated: 'mistranslated',
  illegal: 'illegal',
  other: 'other',
};

/**
 * The anticorruption layer between Game and Moderation (ADR 0001): hands Moderation, through the
 * command it publishes, the reports the players of a game make. In the command of the game, so in
 * PostgreSQL the report is kept or lost with it.
 */
export class ModerationDilemmaReports implements DilemmaReports {
  readonly #receiveDilemmaReport: ReceiveDilemmaReport;

  constructor(receiveDilemmaReport: ReceiveDilemmaReport) {
    this.#receiveDilemmaReport = receiveDilemmaReport;
  }

  async report({
    dilemmaId,
    version,
    reason,
    comment,
    language,
    identity,
    at,
  }: DilemmaReport): Promise<void> {
    await this.#receiveDilemmaReport.execute({
      dilemmaId,
      version,
      reason: MODERATION_REASONS[reason],
      comment,
      language,
      identity,
      reportedAt: at,
    });
  }
}
