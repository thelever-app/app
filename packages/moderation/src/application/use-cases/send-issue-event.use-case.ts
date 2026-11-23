import type { Entry, Issue } from '../../domain/entities/issue.ts';
import { DilemmaReport } from '../../domain/entities/dilemma-report.ts';
import { IllegalContentNotice } from '../../domain/entities/illegal-content-notice.ts';
import { NicknameReport } from '../../domain/entities/nickname-report.ts';
import type { IssueRepository } from '../ports/issue-repository.port.ts';
import type { IssueTracker } from '../ports/issue-tracker.port.ts';
import type { Mailer } from '../ports/mailer.port.ts';
import type { ModeratedDilemmas } from '../ports/moderated-dilemmas.port.ts';
import type { Outbox } from '../ports/outbox.port.ts';
import { acknowledgementEmail, decisionEmail } from '../texts/email-texts.ts';
import {
  HIDDEN_COMMENT,
  HIDDEN_LABEL,
  issueBody,
  issueTitle,
  receivedComment,
} from '../texts/issue-texts.ts';

/** An issue the outbox names but the repository does not have: the outbox and the issues disagree. */
export class IssueNotFoundError extends Error {
  constructor(issueId: string) {
    super(`issue ${issueId} is not kept`);
    this.name = 'IssueNotFoundError';
  }
}

function entryOf(issue: Issue, entryId: string): Entry {
  const { dilemmaReports, nicknameReports, notices } = issue.toSnapshot();
  const dilemmaReport = dilemmaReports.find(({ id }) => id === entryId);
  if (dilemmaReport) return DilemmaReport.fromSnapshot(dilemmaReport);
  const nicknameReport = nicknameReports.find(({ id }) => id === entryId);
  if (nicknameReport) return NicknameReport.fromSnapshot(nicknameReport);
  const notice = notices.find(({ id }) => id === entryId);
  if (notice) return IllegalContentNotice.fromSnapshot(notice);
  throw new Error(`issue ${issue.id} has no entry ${entryId}`);
}

function numberOf(issue: Issue): number {
  if (issue.number === null) throw new Error(`issue ${issue.id} is not in the repository yet`);
  return issue.number;
}

/**
 * Sends the oldest event of the outbox where it goes: the moderation repository, or the email of
 * whoever sent a notice. Run in a transaction of its own: if sending fails, the event stays and
 * the next run sends it again. Says whether there was one.
 */
export class SendIssueEventUseCase {
  readonly #issues: IssueRepository;
  readonly #outbox: Outbox;
  readonly #tracker: IssueTracker;
  readonly #mailer: Mailer;
  readonly #dilemmas: ModeratedDilemmas;

  constructor(ports: {
    readonly issues: IssueRepository;
    readonly outbox: Outbox;
    readonly tracker: IssueTracker;
    readonly mailer: Mailer;
    readonly dilemmas: ModeratedDilemmas;
  }) {
    this.#issues = ports.issues;
    this.#outbox = ports.outbox;
    this.#tracker = ports.tracker;
    this.#mailer = ports.mailer;
    this.#dilemmas = ports.dilemmas;
  }

  async execute(): Promise<boolean> {
    const [pending] = await this.#outbox.pending();
    if (!pending) return false;
    const issue = await this.#issues.findById(pending.issueId);
    if (!issue) throw new IssueNotFoundError(pending.issueId);
    const { event } = pending;
    switch (event.type) {
      case 'opened': {
        const { content } = issue;
        const text =
          content.kind === 'dilemma' ? await this.#dilemmas.textOf(content.dilemmaId) : null;
        const entry = entryOf(issue, event.entryId);
        issue.numbered(
          await this.#tracker.open({
            title: issueTitle(content, text),
            body: issueBody(content, text, entry),
          }),
        );
        await this.#issues.save(issue);
        break;
      }
      case 'received':
        await this.#tracker.comment(
          numberOf(issue),
          receivedComment(entryOf(issue, event.entryId)),
        );
        break;
      case 'hidden':
        await this.#tracker.label(numberOf(issue), HIDDEN_LABEL);
        await this.#tracker.comment(numberOf(issue), HIDDEN_COMMENT);
        break;
      case 'acknowledged': {
        const notice = entryOf(issue, event.entryId).toSnapshot();
        if ('email' in notice && notice.email !== null) {
          await this.#mailer.send(
            acknowledgementEmail({ ...notice, email: notice.email }, numberOf(issue)),
          );
        }
        break;
      }
      case 'decided': {
        const { decision } = issue;
        if (!decision) throw new Error(`issue ${issue.id} is not decided`);
        for (const notice of issue.toSnapshot().notices) {
          if (notice.email === null) continue;
          await this.#mailer.send(
            decisionEmail({ ...notice, email: notice.email }, numberOf(issue), decision),
          );
        }
        break;
      }
    }
    await this.#outbox.sent(pending.id);
    return true;
  }
}
