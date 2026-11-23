import type { IssueRepository } from '../ports/issue-repository.port.ts';

/** The issues in the moderation repository the team has not decided on, for the job to read them. */
export class GetUndecidedIssuesUseCase {
  readonly #issues: IssueRepository;

  constructor(issues: IssueRepository) {
    this.#issues = issues;
  }

  async execute(): Promise<string[]> {
    return (await this.#issues.undecidedInRepository()).map(({ id }) => id);
  }
}
