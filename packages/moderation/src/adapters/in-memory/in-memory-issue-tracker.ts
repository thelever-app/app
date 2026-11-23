import type { IssueTracker, TrackedIssue } from '../../application/ports/issue-tracker.port.ts';

/** An issue of the fake moderation repository, as the team would see it on GitHub. */
export interface FakeIssue {
  readonly number: number;
  readonly title: string;
  readonly body: string;
  readonly labels: string[];
  readonly comments: string[];
  closed: boolean;
}

/**
 * The moderation repository, in memory: what the job writes stays here, and a test plays the team
 * by labelling, commenting and closing.
 */
export class InMemoryIssueTracker implements IssueTracker {
  readonly #issues: FakeIssue[] = [];

  async open({ title, body }: { title: string; body: string }): Promise<number> {
    const number = this.#issues.length + 1;
    this.#issues.push({ number, title, body, labels: [], comments: [], closed: false });
    return number;
  }

  async comment(number: number, body: string): Promise<void> {
    this.#issue(number).comments.push(body);
  }

  async label(number: number, label: string): Promise<void> {
    const issue = this.#issue(number);
    if (!issue.labels.includes(label)) issue.labels.push(label);
  }

  async read(number: number): Promise<TrackedIssue> {
    const { closed, labels, comments } = this.#issue(number);
    return { closed, labels: [...labels], comments: [...comments] };
  }

  async reopen(number: number): Promise<void> {
    this.#issue(number).closed = false;
  }

  /** The team labels the issue, writes the comment and closes it, as on GitHub. */
  decide(number: number, { label, comment }: { label: string; comment?: string }): void {
    const issue = this.#issue(number);
    issue.labels.push(label);
    if (comment !== undefined) issue.comments.push(comment);
    issue.closed = true;
  }

  issues(): FakeIssue[] {
    return this.#issues.map((issue) => ({
      ...issue,
      labels: [...issue.labels],
      comments: [...issue.comments],
    }));
  }

  #issue(number: number): FakeIssue {
    const issue = this.#issues.find((candidate) => candidate.number === number);
    if (!issue) throw new Error(`no issue #${number}`);
    return issue;
  }
}
