import { ContentMismatchError } from '../errors/content-mismatch.error.ts';
import { IssueAlreadyDecidedError } from '../errors/issue-already-decided.error.ts';
import type { IssueEvent } from '../events/issue-event.ts';
import type { Decision } from '../vos/decision.vo.ts';
import type { IssueContent } from '../vos/issue-content.vo.ts';
import { DilemmaReport, type DilemmaReportSnapshot } from './dilemma-report.ts';
import {
  IllegalContentNotice,
  type IllegalContentNoticeSnapshot,
} from './illegal-content-notice.ts';
import { NicknameReport, type NicknameReportSnapshot } from './nickname-report.ts';

/**
 * How many different players hide a dilemma from new games by reporting it (glossary, «Umbral de
 * reportes»; «Umbrales de exploración y moderación»).
 */
export const REPORT_THRESHOLD = 3;

/** What reaches an issue: a report of a player or a notice of anyone. */
export type Entry = DilemmaReport | NicknameReport | IllegalContentNotice;

export interface IssueSnapshot {
  readonly id: string;
  readonly content: IssueContent;
  /** Its number in the moderation repository, once the issue is there. */
  readonly number: number | null;
  readonly openedAt: Date;
  /** Whether the reports hid the dilemma from new games until the team decides. */
  readonly hidden: boolean;
  readonly decision: Decision | null;
  readonly dilemmaReports: readonly DilemmaReportSnapshot[];
  readonly nicknameReports: readonly NicknameReportSnapshot[];
  readonly notices: readonly IllegalContentNoticeSnapshot[];
}

/**
 * The issue of a content in the moderation repository (glossary, «Repo moderation»): every
 * report and notice of that content until the team decides, and the decision. A report of the
 * same content after the decision opens another issue.
 */
export class Issue {
  readonly #id: string;
  readonly #content: IssueContent;
  readonly #openedAt: Date;
  #number: number | null;
  #hidden: boolean;
  #decision: Decision | null;
  readonly #dilemmaReports: DilemmaReport[];
  readonly #nicknameReports: NicknameReport[];
  readonly #notices: IllegalContentNotice[];
  #events: IssueEvent[] = [];

  private constructor(snapshot: IssueSnapshot) {
    this.#id = snapshot.id;
    this.#content = snapshot.content;
    this.#openedAt = snapshot.openedAt;
    this.#number = snapshot.number;
    this.#hidden = snapshot.hidden;
    this.#decision = snapshot.decision;
    this.#dilemmaReports = snapshot.dilemmaReports.map((report) =>
      DilemmaReport.fromSnapshot(report),
    );
    this.#nicknameReports = snapshot.nicknameReports.map((report) =>
      NicknameReport.fromSnapshot(report),
    );
    this.#notices = snapshot.notices.map((notice) => IllegalContentNotice.fromSnapshot(notice));
  }

  /** The issue of a content nobody reported since its last decision, with what reached it first. */
  static openWith(id: string, content: IssueContent, first: Entry, at: Date): Issue {
    const issue = new Issue({
      id,
      content,
      number: null,
      openedAt: at,
      hidden: false,
      decision: null,
      dilemmaReports: [],
      nicknameReports: [],
      notices: [],
    });
    issue.#add(first, 'opened');
    return issue;
  }

  static fromSnapshot(snapshot: IssueSnapshot): Issue {
    return new Issue(snapshot);
  }

  get id(): string {
    return this.#id;
  }

  get content(): IssueContent {
    return this.#content;
  }

  get number(): number | null {
    return this.#number;
  }

  get hidden(): boolean {
    return this.#hidden;
  }

  get decision(): Decision | null {
    return this.#decision;
  }

  /** A later report or notice of the same content; enough reports hide a dilemma. */
  receive(entry: Entry): void {
    if (this.#decision) throw new IssueAlreadyDecidedError(this.#id);
    this.#add(entry, 'received');
    if (
      this.#content.kind === 'dilemma' &&
      !this.#hidden &&
      new Set(this.#dilemmaReports.map(({ identity }) => identity)).size >= REPORT_THRESHOLD
    ) {
      this.#hidden = true;
      this.#events.push({ type: 'hidden' });
    }
  }

  /** The issue is in the moderation repository with that number. */
  numbered(number: number): void {
    this.#number = number;
  }

  decide(decision: Decision): void {
    if (this.#decision) throw new IssueAlreadyDecidedError(this.#id);
    this.#decision = decision;
    this.#events.push({ type: 'decided' });
  }

  /** The players who reported it, once each, in the order they first did: the decision goes to them. */
  reporters(): string[] {
    return [
      ...new Set(
        [...this.#dilemmaReports, ...this.#nicknameReports].map(({ identity }) => identity),
      ),
    ];
  }

  pullEvents(): IssueEvent[] {
    const events = this.#events;
    this.#events = [];
    return events;
  }

  toSnapshot(): IssueSnapshot {
    return {
      id: this.#id,
      content: this.#content,
      number: this.#number,
      openedAt: this.#openedAt,
      hidden: this.#hidden,
      decision: this.#decision,
      dilemmaReports: this.#dilemmaReports.map((report) => report.toSnapshot()),
      nicknameReports: this.#nicknameReports.map((report) => report.toSnapshot()),
      notices: this.#notices.map((notice) => notice.toSnapshot()),
    };
  }

  #add(entry: Entry, type: 'opened' | 'received'): void {
    const content = this.#content;
    if (entry instanceof DilemmaReport) {
      if (content.kind !== 'dilemma' || content.dilemmaId !== entry.dilemmaId) {
        throw new ContentMismatchError(this.#id, entry.id);
      }
      this.#dilemmaReports.push(entry);
    } else if (entry instanceof NicknameReport) {
      const { nickname, owner } = entry.toSnapshot();
      if (content.kind !== 'nickname' || content.nickname !== nickname || content.owner !== owner) {
        throw new ContentMismatchError(this.#id, entry.id);
      }
      this.#nicknameReports.push(entry);
    } else {
      if (content.kind === 'nickname') throw new ContentMismatchError(this.#id, entry.id);
      this.#notices.push(entry);
    }
    this.#events.push({ type, entryId: entry.id });
    if (entry instanceof IllegalContentNotice && entry.email !== null) {
      this.#events.push({ type: 'acknowledged', entryId: entry.id });
    }
  }
}
