export class NotItsOriginalError extends Error {
  constructor(dilemmaId: string, originalId: string) {
    super(`dilemma ${originalId} is not the original of dilemma ${dilemmaId}`);
    this.name = 'NotItsOriginalError';
  }
}
