/** The page of the search asked for does not start where a page of that search ended. */
export class InvalidPageError extends Error {
  constructor(after: string) {
    super(`no page of this search starts after ${after}`);
    this.name = 'InvalidPageError';
  }
}
