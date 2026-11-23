/** One identity sent as many notices today as the web form takes. */
export class TooManyNoticesError extends Error {
  constructor(maximum: number) {
    super(`no more than ${maximum} notices a day`);
    this.name = 'TooManyNoticesError';
  }
}
