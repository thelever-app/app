export class AnswerIncompleteError extends Error {
  constructor(dilemmaId: string) {
    super(`the answer to dilemma ${dilemmaId} was complete and cannot lose its predictions`);
    this.name = 'AnswerIncompleteError';
  }
}
