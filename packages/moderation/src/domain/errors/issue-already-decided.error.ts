/** The team decides on an issue once; a report after that opens another issue. */
export class IssueAlreadyDecidedError extends Error {
  constructor(issueId: string) {
    super(`issue ${issueId} is already decided`);
    this.name = 'IssueAlreadyDecidedError';
  }
}
