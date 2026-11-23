import type { Issue } from '../../domain/entities/issue.ts';
import type { IssueContent } from '../../domain/vos/issue-content.vo.ts';

/** Where the issues are kept, with their reports and notices. */
export interface IssueRepository {
  save(issue: Issue): Promise<void>;
  findById(id: string): Promise<Issue | undefined>;
  /**
   * The issue of the content the team has not decided on yet, if any: of the dilemma, or of the
   * nickname of that player. A reference opens an issue of its own every time.
   */
  undecidedOf(content: IssueContent): Promise<Issue | undefined>;
  /** The issues in the moderation repository the team has not decided on, the oldest first. */
  undecidedInRepository(): Promise<Issue[]>;
  /** How many notices that identity sent since then, to keep the web form from flooding the team. */
  noticesSentSince(identity: string, since: Date): Promise<number>;
}
