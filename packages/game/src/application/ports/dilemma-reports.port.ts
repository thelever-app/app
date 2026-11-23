import type { DilemmaLanguage } from '../../domain/vos/room-settings.vo.ts';

/** Why a player reports a dilemma; only an offensive one lets them skip it. */
export const REPORT_REASONS = [
  'offensive',
  'confusing',
  'mistranslated',
  'illegal',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** A report of a dilemma, as the game hands it to Moderation. */
export interface DilemmaReport {
  readonly dilemmaId: string;
  /** The version the player saw. */
  readonly version: number;
  readonly reason: ReportReason;
  readonly comment: string | null;
  /** The language the player read it in: a mistranslation is of one translation. */
  readonly language: DilemmaLanguage;
  /**
   * Who reports, because the report threshold counts different players. What Moderation keeps of
   * it is up to Moderation.
   */
  readonly identity: string;
  /** When the player reported it. */
  readonly at: Date;
}

/** How the Game context hands the reports of its players to the Moderation context. */
export interface DilemmaReports {
  report(report: DilemmaReport): Promise<void>;
}
