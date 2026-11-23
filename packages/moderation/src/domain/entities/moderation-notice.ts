import type { Outcome } from '../vos/decision.vo.ts';
import type { Language } from '../vos/language.vo.ts';
import type { ReportReason } from '../vos/report-reason.vo.ts';

/** What a moderation notice tells, besides the decision. */
export type NoticeSubject =
  /** The decision on a report the player made, about a dilemma or the nickname of another player. */
  | {
      readonly kind: 'report';
      readonly content:
        | { readonly kind: 'dilemma'; readonly text: string }
        | { readonly kind: 'nickname'; readonly nickname: string };
      readonly reason: ReportReason;
      readonly reportedAt: Date;
    }
  /**
   * The decision on the nickname of the player, with its statement of reasons: the reason they
   * were reported for and the facts, in every language of the app.
   */
  | {
      readonly kind: 'nickname';
      readonly nickname: string;
      readonly reason: ReportReason;
      readonly facts: Readonly<Record<Language, string>>;
    };

export interface ModerationNoticeSnapshot {
  readonly id: string;
  /** Who sees it, only on their own screen. */
  readonly identity: string;
  readonly subject: NoticeSubject;
  readonly outcome: Outcome;
  /** The section of the terms of use the team applied. */
  readonly rule: string;
  readonly decidedAt: Date;
  /** When the player saw it; until then, the app shows it every time it opens. */
  readonly seenAt: Date | null;
}

/**
 * What the app shows a player, only on their screen and once, the next time it opens (glossary,
 * «Aviso de moderación»): the decision on their report or on their nickname. A person decided it,
 * and it can be appealed through the contact email.
 */
export class ModerationNotice {
  readonly #id: string;
  readonly #identity: string;
  readonly #subject: NoticeSubject;
  readonly #outcome: Outcome;
  readonly #rule: string;
  readonly #decidedAt: Date;
  #seenAt: Date | null;

  private constructor(snapshot: ModerationNoticeSnapshot) {
    this.#id = snapshot.id;
    this.#identity = snapshot.identity;
    this.#subject = snapshot.subject;
    this.#outcome = snapshot.outcome;
    this.#rule = snapshot.rule;
    this.#decidedAt = snapshot.decidedAt;
    this.#seenAt = snapshot.seenAt;
  }

  static create(notice: Omit<ModerationNoticeSnapshot, 'seenAt'>): ModerationNotice {
    return new ModerationNotice({ ...notice, seenAt: null });
  }

  static fromSnapshot(snapshot: ModerationNoticeSnapshot): ModerationNotice {
    return new ModerationNotice(snapshot);
  }

  get id(): string {
    return this.#id;
  }

  get identity(): string {
    return this.#identity;
  }

  /** Seen once is seen: a second time keeps the first. */
  seen(at: Date): void {
    this.#seenAt ??= at;
  }

  toSnapshot(): ModerationNoticeSnapshot {
    return {
      id: this.#id,
      identity: this.#identity,
      subject: this.#subject,
      outcome: this.#outcome,
      rule: this.#rule,
      decidedAt: this.#decidedAt,
      seenAt: this.#seenAt,
    };
  }
}
