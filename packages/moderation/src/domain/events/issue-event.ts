/**
 * What happened to an issue that the moderation repository, or whoever sent a notice, still has to
 * learn. They leave in the same transaction as the issue, as the outbox, so none is lost or sent
 * twice when a command fails.
 */
export type IssueEvent =
  /** The issue was opened with that report or notice: it goes to the repository with it. */
  | { readonly type: 'opened'; readonly entryId: string }
  /** One more report or notice of the content. */
  | { readonly type: 'received'; readonly entryId: string }
  /** The reports hid the dilemma from new games until the team decides. */
  | { readonly type: 'hidden' }
  /** A notice with an email: its acknowledgement of receipt is sent to it. */
  | { readonly type: 'acknowledged'; readonly entryId: string }
  /** The team decided: that notice had an email, and the decision goes to it. */
  | { readonly type: 'decided'; readonly entryId: string };
