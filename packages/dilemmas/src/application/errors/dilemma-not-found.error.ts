export class DilemmaNotFoundError extends Error {
  readonly dilemmaId: string;

  constructor(dilemmaId: string) {
    super(`dilemma ${dilemmaId} does not exist`);
    this.name = 'DilemmaNotFoundError';
    this.dilemmaId = dilemmaId;
  }
}
