/** Why a player reports a dilemma. */
export const REPORT_REASONS = ['offensive', 'confusing', 'mistranslated', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
