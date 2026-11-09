/** Why a player reports a dilemma; only an offensive one lets them skip it. */
export const REPORT_REASONS = ['offensive', 'confusing', 'mistranslated', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** A report of a dilemma, as the game hands it to Moderation. */
export interface DilemmaReport {
  readonly dilemmaId: string;
  /** The version the player saw. */
  readonly version: number;
  readonly reason: ReportReason;
  readonly comment: string | null;
  /**
   * Who reports, because the report threshold counts different players. What Moderation keeps of
   * it is up to Moderation.
   */
  readonly identity: string;
}

/** How the Game context hands the reports of its players to the Moderation context. */
export interface DilemmaReports {
  report(report: DilemmaReport): Promise<void>;
}
