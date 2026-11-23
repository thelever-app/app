/** A report or a notice of one content cannot go on the issue of another. */
export class ContentMismatchError extends Error {
  constructor(issueId: string, entryId: string) {
    super(`${entryId} is not about the content of issue ${issueId}`);
    this.name = 'ContentMismatchError';
  }
}
