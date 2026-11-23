import type { IssueEvent } from '../../domain/events/issue-event.ts';

/** An event of an issue that has not reached the moderation repository or an email yet. */
export interface PendingEvent {
  readonly id: number;
  readonly issueId: string;
  readonly event: IssueEvent;
}

/**
 * The outbox: what the issues have to tell the moderation repository and the senders of notices.
 * It is written in the transaction of the command that changed the issue, and the job sends it.
 */
export interface Outbox {
  add(issueId: string, events: readonly IssueEvent[]): Promise<void>;
  /** The events not sent yet, in the order they happened. */
  pending(): Promise<PendingEvent[]>;
  /** The event reached where it goes: it is not sent again. */
  sent(id: number): Promise<void>;
}
