import type { IssueRepository } from '../../application/ports/issue-repository.port.ts';
import { Issue, type IssueSnapshot } from '../../domain/entities/issue.ts';
import type { IssueContent } from '../../domain/vos/issue-content.vo.ts';

function sameContent(a: IssueContent, b: IssueContent): boolean {
  if (a.kind === 'dilemma' && b.kind === 'dilemma') return a.dilemmaId === b.dilemmaId;
  if (a.kind === 'nickname' && b.kind === 'nickname') {
    return a.nickname === b.nickname && a.owner === b.owner;
  }
  return false;
}

/** Keeps the snapshots, which are never changed, so what it gives back is never the object saved. */
export class InMemoryIssueRepository implements IssueRepository {
  readonly #snapshots = new Map<string, IssueSnapshot>();

  async save(issue: Issue): Promise<void> {
    this.#snapshots.set(issue.id, issue.toSnapshot());
  }

  async findById(id: string): Promise<Issue | undefined> {
    const snapshot = this.#snapshots.get(id);
    return snapshot && Issue.fromSnapshot(snapshot);
  }

  async undecidedOf(content: IssueContent): Promise<Issue | undefined> {
    const snapshot = [...this.#snapshots.values()].find(
      (issue) => issue.decision === null && sameContent(issue.content, content),
    );
    return snapshot && Issue.fromSnapshot(snapshot);
  }

  async undecidedInRepository(): Promise<Issue[]> {
    return [...this.#snapshots.values()]
      .filter(({ decision, number }) => decision === null && number !== null)
      .sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime() || a.id.localeCompare(b.id))
      .map((snapshot) => Issue.fromSnapshot(snapshot));
  }

  async noticesSentSince(identity: string, since: Date): Promise<number> {
    return [...this.#snapshots.values()]
      .flatMap(({ notices }) => notices)
      .filter((notice) => notice.identity === identity && notice.sentAt >= since).length;
  }

  async involving(identity: string): Promise<Issue[]> {
    return [...this.#snapshots.values()]
      .map((snapshot) => Issue.fromSnapshot(snapshot))
      .filter((issue) => issue.involves(identity))
      .sort((a, b) => a.toSnapshot().openedAt.getTime() - b.toSnapshot().openedAt.getTime());
  }

  async sendersWithEmail(email: string): Promise<string[]> {
    const senders = [...this.#snapshots.values()]
      .flatMap(({ notices }) => notices)
      .filter((notice) => notice.email?.toLowerCase() === email.trim().toLowerCase())
      .flatMap(({ identity }) => (identity === null ? [] : [identity]));
    return [...new Set(senders)];
  }

  /** Every issue kept, for tests and the scenarios to read. */
  all(): IssueSnapshot[] {
    return [...this.#snapshots.values()].map((snapshot) => snapshot);
  }
}
