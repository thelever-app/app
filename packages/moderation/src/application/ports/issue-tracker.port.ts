/** An issue as the moderation repository has it when the job reads it. */
export interface TrackedIssue {
  readonly closed: boolean;
  readonly labels: readonly string[];
  /** Its comments, the oldest first. */
  readonly comments: readonly string[];
}

/** The private moderation repository, where each issue waits for the team (glossary). */
export interface IssueTracker {
  /** Opens an issue and gives its number. */
  open(issue: { readonly title: string; readonly body: string }): Promise<number>;
  comment(number: number, body: string): Promise<void>;
  label(number: number, label: string): Promise<void>;
  read(number: number): Promise<TrackedIssue>;
  reopen(number: number): Promise<void>;
}
