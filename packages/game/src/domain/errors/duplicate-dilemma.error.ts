export class DuplicateDilemmaError extends Error {
  constructor(dilemmaId: string) {
    super(`dilemma ${dilemmaId} appears more than once in the game`);
    this.name = 'DuplicateDilemmaError';
  }
}
