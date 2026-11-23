/** No free code for requests by email turned up after several tries. */
export class RequestCodeUnavailableError extends Error {
  constructor() {
    super('there is no free request code');
    this.name = 'RequestCodeUnavailableError';
  }
}
