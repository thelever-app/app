import type { Issue } from '../../domain/entities/issue.ts';
import { ModerationNotice, type NoticeSubject } from '../../domain/entities/moderation-notice.ts';
import type { Clock } from '../../domain/ports/clock.port.ts';
import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import type { Outcome } from '../../domain/vos/decision.vo.ts';
import type { ReportReason } from '../../domain/vos/report-reason.vo.ts';
import type { FactsTranslator } from '../ports/facts-translator.port.ts';
import type { IssueRepository } from '../ports/issue-repository.port.ts';
import type { IssueTracker, TrackedIssue } from '../ports/issue-tracker.port.ts';
import type { ModeratedDilemmas } from '../ports/moderated-dilemmas.port.ts';
import type { ModeratedNicknames } from '../ports/moderated-nicknames.port.ts';
import type { ModerationNoticeRepository } from '../ports/moderation-notice-repository.port.ts';
import type { Outbox } from '../ports/outbox.port.ts';
import { type DecisionProblem, PROBLEM_COMMENTS } from '../texts/issue-texts.ts';

/** The labels of a decision, and what each decides (glossary: withdraw, restore and keep). */
export const DECISION_LABELS: Readonly<Record<string, Outcome>> = {
  withdraw: 'withdrawn',
  restore: 'kept',
  keep: 'kept',
};

/** What a moderation notice of a report is about. */
type ReportedContent = Extract<NoticeSubject, { readonly kind: 'report' }>['content'];

const FACTS = /^\s*Hechos:\s*([\s\S]*?)\s*^\s*Regla:\s*(.+?)\s*$/im;

/** What the team decided when it closed the issue, or why the job cannot tell. */
export function decisionIn(
  tracked: TrackedIssue,
): { readonly outcome: Outcome; readonly facts: string; readonly rule: string } | DecisionProblem {
  const outcomes = tracked.labels.flatMap((label) => {
    const outcome = DECISION_LABELS[label];
    return outcome ? [outcome] : [];
  });
  if (outcomes.length === 0) return 'no-decision';
  if (outcomes.length > 1) return 'several-decisions';
  // The last comment with the reasons: a later one corrects an earlier one.
  for (const comment of [...tracked.comments].reverse()) {
    const match = FACTS.exec(comment);
    const facts = match?.[1]?.trim();
    const rule = match?.[2]?.trim();
    if (facts && rule) return { outcome: outcomes[0]!, facts, rule };
  }
  return 'no-reasons';
}

/** The reason of the first report of each reporter, and when they made it. */
function firstReports(issue: Issue): Map<string, { reason: ReportReason; reportedAt: Date }> {
  const { dilemmaReports, nicknameReports } = issue.toSnapshot();
  const first = new Map<string, { reason: ReportReason; reportedAt: Date }>();
  for (const { identity, reason, reportedAt } of [...dilemmaReports, ...nicknameReports]) {
    const known = first.get(identity);
    if (!known || reportedAt < known.reportedAt) first.set(identity, { reason, reportedAt });
  }
  return first;
}

/** The reason most players reported the nickname for, the first one on a tie. */
function mostReported(issue: Issue): ReportReason {
  const counts = new Map<ReportReason, number>();
  for (const { reason } of issue.toSnapshot().nicknameReports) {
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts].reduce((most, entry) => (entry[1] > most[1] ? entry : most))[0];
}

/**
 * Reads, in the moderation repository, the decision of the team on one issue it has not decided
 * yet, and applies it: the dilemma leaves new games or comes back, the nickname leaves the rooms,
 * whoever reported and whoever the nickname is gets a moderation notice, and whoever sent a
 * notice with an email gets the decision there. An issue closed without a decision the job can
 * read is opened again, with a comment of what is missing.
 */
export class ReadDecisionUseCase {
  readonly #issues: IssueRepository;
  readonly #outbox: Outbox;
  readonly #tracker: IssueTracker;
  readonly #dilemmas: ModeratedDilemmas;
  readonly #nicknames: ModeratedNicknames;
  readonly #notices: ModerationNoticeRepository;
  readonly #translator: FactsTranslator;
  readonly #idGenerator: IdGenerator;
  readonly #clock: Clock;

  constructor(ports: {
    readonly issues: IssueRepository;
    readonly outbox: Outbox;
    readonly tracker: IssueTracker;
    readonly dilemmas: ModeratedDilemmas;
    readonly nicknames: ModeratedNicknames;
    readonly notices: ModerationNoticeRepository;
    readonly translator: FactsTranslator;
    readonly idGenerator: IdGenerator;
    readonly clock: Clock;
  }) {
    this.#issues = ports.issues;
    this.#outbox = ports.outbox;
    this.#tracker = ports.tracker;
    this.#dilemmas = ports.dilemmas;
    this.#nicknames = ports.nicknames;
    this.#notices = ports.notices;
    this.#translator = ports.translator;
    this.#idGenerator = ports.idGenerator;
    this.#clock = ports.clock;
  }

  async execute(issueId: string): Promise<void> {
    const issue = await this.#issues.findById(issueId);
    if (!issue || issue.decision || issue.number === null) return;
    const tracked = await this.#tracker.read(issue.number);
    if (!tracked.closed) return;
    const read = decisionIn(tracked);
    if (typeof read === 'string') {
      await this.#tracker.comment(issue.number, PROBLEM_COMMENTS[read]);
      await this.#tracker.reopen(issue.number);
      return;
    }
    const decidedAt = this.#clock.now();
    const decision = {
      ...read,
      translatedFacts: await this.#translator.translate(read.facts),
      decidedAt,
    };
    const { content, hidden } = issue;
    issue.decide(decision);

    let reported: ReportedContent | null = null;
    switch (content.kind) {
      case 'dilemma': {
        if (decision.outcome === 'withdrawn') await this.#dilemmas.withdraw(content.dilemmaId);
        else if (hidden) await this.#dilemmas.restore(content.dilemmaId);
        const text = (await this.#dilemmas.textOf(content.dilemmaId)) ?? content.dilemmaId;
        reported = { kind: 'dilemma', text };
        break;
      }
      case 'nickname': {
        if (decision.outcome === 'withdrawn') {
          await this.#nicknames.withdraw(content.owner, content.nickname);
          await this.#notices.save(
            ModerationNotice.create({
              id: this.#idGenerator.generate(),
              identity: content.owner,
              subject: {
                kind: 'nickname',
                nickname: content.nickname,
                reason: mostReported(issue),
                facts: decision.translatedFacts,
              },
              outcome: decision.outcome,
              rule: decision.rule,
              decidedAt,
            }),
          );
        }
        reported = { kind: 'nickname', nickname: content.nickname };
        break;
      }
      case 'reference':
        break;
    }
    if (reported) {
      for (const [identity, { reason, reportedAt }] of firstReports(issue)) {
        await this.#notices.save(
          ModerationNotice.create({
            id: this.#idGenerator.generate(),
            identity,
            subject: { kind: 'report', content: reported, reason, reportedAt },
            outcome: decision.outcome,
            rule: decision.rule,
            decidedAt,
          }),
        );
      }
    }
    await this.#issues.save(issue);
    await this.#outbox.add(issue.id, issue.pullEvents());
  }
}
