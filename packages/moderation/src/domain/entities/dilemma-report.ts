import { CommentTooLongError } from '../errors/comment-too-long.error.ts';
import { InvalidEntryError } from '../errors/invalid-entry.error.ts';
import { isLanguage, type Language } from '../vos/language.vo.ts';
import { DILEMMA_REPORT_REASONS, type DilemmaReportReason } from '../vos/report-reason.vo.ts';

/** The longest comment a report may have. */
export const MAXIMUM_COMMENT_LENGTH = 280;

export interface DilemmaReportSnapshot {
  readonly id: string;
  readonly dilemmaId: string;
  /** The version the player saw. */
  readonly version: number;
  readonly reason: DilemmaReportReason;
  readonly comment: string | null;
  /** The language the player read it in: without it, «mistranslated» says no translation to check. */
  readonly language: Language;
  /**
   * Who reports: the report threshold counts different players, and the decision goes back to
   * them. Null once their data are deleted: the report stays, as one more player, without them.
   */
  readonly identity: string | null;
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
    if (!(DILEMMA_REPORT_REASONS as readonly string[]).includes(report.reason)) {
      throw new InvalidEntryError('reason', report.reason);
    }
    if (!isLanguage(report.language)) throw new InvalidEntryError('language', report.language);
    checkComment(report.comment);
    return new DilemmaReport(report);
  }

  static fromSnapshot(snapshot: DilemmaReportSnapshot): DilemmaReport {
    return new DilemmaReport(snapshot);
  }

  get id(): string {
    return this.#snapshot.id;
  }

  get dilemmaId(): string {
    return this.#snapshot.dilemmaId;
  }

  get identity(): string | null {
    return this.#snapshot.identity;
  }

  /** The same report, without who made it nor, if it was about them, nothing else of theirs. */
  unlinked(identity: string): DilemmaReport {
    if (this.#snapshot.identity !== identity) return this;
    return new DilemmaReport({ ...this.#snapshot, identity: null });
  }

  get reason(): DilemmaReportReason {
    return this.#snapshot.reason;
  }

  toSnapshot(): DilemmaReportSnapshot {
    return { ...this.#snapshot };
  }
}

/** A comment is optional and short: what it says goes with the reason, not in its place. */
export function checkComment(comment: string | null): void {
  if (comment !== null && comment.length > MAXIMUM_COMMENT_LENGTH) {
    throw new CommentTooLongError(comment.length, MAXIMUM_COMMENT_LENGTH);
  }
}
