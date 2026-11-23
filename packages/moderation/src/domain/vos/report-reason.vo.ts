/** Why a player reports a dilemma. */
export const DILEMMA_REPORT_REASONS = [
  'offensive',
  'confusing',
  'mistranslated',
  'illegal',
  'other',
] as const;
export type DilemmaReportReason = (typeof DILEMMA_REPORT_REASONS)[number];

/** Why a player reports the nickname of another. */
export const NICKNAME_REPORT_REASONS = ['offensive', 'impersonation', 'illegal', 'other'] as const;
export type NicknameReportReason = (typeof NICKNAME_REPORT_REASONS)[number];

export type ReportReason = DilemmaReportReason | NicknameReportReason;
