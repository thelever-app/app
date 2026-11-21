import { CommentTooLongError } from '../errors/comment-too-long.error.ts';
import type { ReportReason } from '../vos/report-reason.vo.ts';

/** The longest comment a report may have. */
export const MAXIMUM_COMMENT_LENGTH = 280;

export interface DilemmaReportSnapshot {
  readonly id: string;
  readonly dilemmaId: string;
  /** The version the player saw. */
  readonly version: number;
  readonly reason: ReportReason;
  readonly comment: string | null;
  /** Who reports: the report threshold counts different players, and the decision goes back to them. */
  readonly identity: string;
  /** When, which the 3 years it is kept for count from. */
  readonly reportedAt: Date;
}

/** A report a player made of a dilemma, as Moderation keeps it. */
export class DilemmaReport {
  readonly #snapshot: DilemmaReportSnapshot;

  private constructor(snapshot: DilemmaReportSnapshot) {
    this.#snapshot = { ...snapshot };
  }

  static receive(report: DilemmaReportSnapshot): DilemmaReport {
    if (report.comment !== null && report.comment.length > MAXIMUM_COMMENT_LENGTH) {
      throw new CommentTooLongError(report.comment.length, MAXIMUM_COMMENT_LENGTH);
    }
    return new DilemmaReport(report);
  }

  static fromSnapshot(snapshot: DilemmaReportSnapshot): DilemmaReport {
    return new DilemmaReport(snapshot);
  }

  get id(): string {
    return this.#snapshot.id;
  }

  toSnapshot(): DilemmaReportSnapshot {
    return { ...this.#snapshot };
  }
}
