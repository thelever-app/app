export class NotAnOriginalError extends Error {
  constructor(dilemmaId: string) {
    super(`dilemma ${dilemmaId} is a translation: only an original is translated`);
    this.name = 'NotAnOriginalError';
  }
}
