/** The comment of a report is short: what it says goes with the reason, not in its place. */
export class CommentTooLongError extends Error {
  constructor(length: number, maximum: number) {
    super(`a comment of ${length} characters is longer than ${maximum}`);
    this.name = 'CommentTooLongError';
  }
}
