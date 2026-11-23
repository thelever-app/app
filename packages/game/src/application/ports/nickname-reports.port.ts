/** Why a player reports the nickname of another. */
export const NICKNAME_REPORT_REASONS = ['offensive', 'impersonation', 'illegal', 'other'] as const;
export type NicknameReportReason = (typeof NICKNAME_REPORT_REASONS)[number];

/** A report of the nickname of a player, as the room hands it to Moderation. */
export interface NicknameReport {
  readonly nickname: string;
  /** Who goes by it, because the team may withdraw it and tell them why. */
  readonly owner: string;
  readonly reason: NicknameReportReason;
  readonly comment: string | null;
  /** Who reports it, for the decision to go back to them. */
  readonly identity: string;
  readonly at: Date;
}

/** How the Game context hands the reports of nicknames to the Moderation context. */
export interface NicknameReports {
  report(report: NicknameReport): Promise<void>;
}
