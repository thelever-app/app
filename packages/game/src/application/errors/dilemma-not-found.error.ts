export class DilemmaNotFoundError extends Error {
  constructor(dilemmaId: string) {
    super(`dilemma ${dilemmaId} does not exist`);
    this.name = 'DilemmaNotFoundError';
  }
}
