/** The age is declared after opening the app, which begins the first access. */
export class FirstAccessNotBegunError extends Error {
  constructor(identity: string) {
    super(`${identity} has not opened the app yet`);
    this.name = 'FirstAccessNotBegunError';
  }
}
