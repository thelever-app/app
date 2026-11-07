export class DilemmaSkippedError extends Error {
  constructor(dilemmaId: string) {
    super(`dilemma ${dilemmaId} was skipped and cannot be answered`);
    this.name = 'DilemmaSkippedError';
  }
}
