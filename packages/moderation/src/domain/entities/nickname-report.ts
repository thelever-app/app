import { InvalidEntryError } from '../errors/invalid-entry.error.ts';
import { NICKNAME_REPORT_REASONS, type NicknameReportReason } from '../vos/report-reason.vo.ts';
import { checkComment } from './dilemma-report.ts';

export interface NicknameReportSnapshot {
  readonly id: string;
  /** The nickname as the reporter saw it. */
  readonly nickname: string;
  /**
   * Who goes by it: if the team withdraws it, it changes in their rooms and they see why. Null
   * once their data are deleted: the nickname stays, as what was decided on.
   */
  readonly owner: string | null;
  readonly reason: NicknameReportReason;
  readonly comment: string | null;
  /** Who reports: the decision goes back to them. Null once their data are deleted. */
  readonly identity: string | null;
  readonly reportedAt: Date;
}

/** A report a player made of the nickname of another player of their room. */
export class NicknameReport {
  readonly #snapshot: NicknameReportSnapshot;

  private constructor(snapshot: NicknameReportSnapshot) {
    this.#snapshot = { ...snapshot };
  }

  static receive(report: NicknameReportSnapshot): NicknameReport {
    if (!(NICKNAME_REPORT_REASONS as readonly string[]).includes(report.reason)) {
      throw new InvalidEntryError('reason', report.reason);
    }
    checkComment(report.comment);
    return new NicknameReport(report);
  }

  static fromSnapshot(snapshot: NicknameReportSnapshot): NicknameReport {
    return new NicknameReport(snapshot);
  }

  get id(): string {
    return this.#snapshot.id;
  }

  get identity(): string | null {
    return this.#snapshot.identity;
  }

  /** The same report without that identity, whether it made it or goes by the nickname. */
  unlinked(identity: string): NicknameReport {
    const { identity: reporter, owner } = this.#snapshot;
    if (reporter !== identity && owner !== identity) return this;
    return new NicknameReport({
      ...this.#snapshot,
      identity: reporter === identity ? null : reporter,
      owner: owner === identity ? null : owner,
    });
  }

  get reason(): NicknameReportReason {
    return this.#snapshot.reason;
  }

  toSnapshot(): NicknameReportSnapshot {
    return { ...this.#snapshot };
  }
}
