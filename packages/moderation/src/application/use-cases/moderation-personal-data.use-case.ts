import type { IssueRepository } from '../ports/issue-repository.port.ts';
import type { ModerationNoticeRepository } from '../ports/moderation-notice-repository.port.ts';

interface DecisionData {
  readonly outcome: string;
  readonly rule: string;
  readonly facts: string;
  readonly decidedAt: string;
}

/** What Moderation keeps of a player, as the file they download shows it (DEC-251). */
export interface ModerationData {
  readonly dilemmaReports: readonly {
    readonly dilemmaId: string;
    readonly version: number;
    readonly reason: string;
    readonly comment: string | null;
    readonly language: string;
    readonly reportedAt: string;
  }[];
  readonly nicknameReports: readonly {
    readonly nickname: string;
    readonly reason: string;
    readonly comment: string | null;
    readonly reportedAt: string;
  }[];
  readonly illegalContentNotices: readonly {
    readonly reference: string;
    readonly explanation: string;
    readonly name: string | null;
    readonly email: string | null;
    readonly language: string;
    readonly sentAt: string;
  }[];
  /**
   * The issues of their nickname, with the decision: never who reported it nor what they wrote,
   * which are data of others (art. 15.4 GDPR).
   */
  readonly reportsOfTheirNickname: readonly {
    readonly nickname: string;
    readonly openedAt: string;
    readonly decision: DecisionData | null;
  }[];
  readonly moderationNotices: readonly {
    readonly subject: unknown;
    readonly outcome: string;
    readonly rule: string;
    readonly decidedAt: string;
    readonly seenAt: string | null;
  }[];
}

/** What Moderation keeps of an identity: what it reported and sent, its nickname and its notices. */
export interface ExportModerationData {
  execute(identity: string): Promise<ModerationData | undefined>;
}

export class ExportModerationDataUseCase implements ExportModerationData {
  readonly #issues: IssueRepository;
  readonly #notices: ModerationNoticeRepository;

  constructor({
    issues,
    notices,
  }: {
    readonly issues: IssueRepository;
    readonly notices: ModerationNoticeRepository;
  }) {
    this.#issues = issues;
    this.#notices = notices;
  }

  async execute(identity: string): Promise<ModerationData | undefined> {
    const issues = (await this.#issues.involving(identity)).map((issue) => issue.toSnapshot());
    const notices = await this.#notices.allOf(identity);
    if (issues.length === 0 && notices.length === 0) return undefined;
    return {
      dilemmaReports: issues
        .flatMap(({ dilemmaReports }) => dilemmaReports)
        .filter((report) => report.identity === identity)
        .map(({ dilemmaId, version, reason, comment, language, reportedAt }) => ({
          dilemmaId,
          version,
          reason,
          comment,
          language,
          reportedAt: reportedAt.toISOString(),
        })),
      nicknameReports: issues
        .flatMap(({ nicknameReports }) => nicknameReports)
        .filter((report) => report.identity === identity)
        .map(({ nickname, reason, comment, reportedAt }) => ({
          nickname,
          reason,
          comment,
          reportedAt: reportedAt.toISOString(),
        })),
      illegalContentNotices: issues
        .flatMap(({ notices: sent }) => sent)
        .filter((notice) => notice.identity === identity)
        .map(({ reference, explanation, name, email, language, sentAt }) => ({
          reference,
          explanation,
          name,
          email,
          language,
          sentAt: sentAt.toISOString(),
        })),
      reportsOfTheirNickname: issues.flatMap(({ content, openedAt, decision }) =>
        content.kind === 'nickname' && content.owner === identity
          ? [
              {
                nickname: content.nickname,
                openedAt: openedAt.toISOString(),
                decision: decision && {
                  outcome: decision.outcome,
                  rule: decision.rule,
                  facts: decision.facts,
                  decidedAt: decision.decidedAt.toISOString(),
                },
              },
            ]
          : [],
      ),
      moderationNotices: notices.map((notice) => {
        const { subject, outcome, rule, decidedAt, seenAt } = notice.toSnapshot();
        return {
          subject: JSON.parse(JSON.stringify(subject)) as unknown,
          outcome,
          rule,
          decidedAt: decidedAt.toISOString(),
          seenAt: seenAt?.toISOString() ?? null,
        };
      }),
    };
  }
}

/**
 * Deleting the data of an identity unlinks it from every issue, which keeps its reports, notices
 * and decisions without it for the 3 years they are kept (DEC-251), and deletes its moderation
 * notices: the decisions stay in their issues. The issues in the moderation repository are left as
 * they are: without the database they tie the nickname or the reference to nobody.
 */
export interface EraseModerationData {
  execute(identity: string): Promise<void>;
}

export class EraseModerationDataUseCase implements EraseModerationData {
  readonly #issues: IssueRepository;
  readonly #notices: ModerationNoticeRepository;

  constructor({
    issues,
    notices,
  }: {
    readonly issues: IssueRepository;
    readonly notices: ModerationNoticeRepository;
  }) {
    this.#issues = issues;
    this.#notices = notices;
  }

  async execute(identity: string): Promise<void> {
    for (const issue of await this.#issues.involving(identity)) {
      issue.unlink(identity);
      await this.#issues.save(issue);
    }
    await this.#notices.deleteAllOf(identity);
  }
}

/**
 * The identities that sent notices of the web form with that email: whoever sent one without the
 * app proves a request by email is theirs by writing from it.
 */
export interface SendersWithEmail {
  execute(email: string): Promise<string[]>;
}

export class SendersWithEmailUseCase implements SendersWithEmail {
  readonly #issues: IssueRepository;

  constructor(issues: IssueRepository) {
    this.#issues = issues;
  }

  async execute(email: string): Promise<string[]> {
    return this.#issues.sendersWithEmail(email);
  }
}
