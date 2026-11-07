export class DilemmaNotSuitableError extends Error {
  constructor(dilemmaId: string) {
    super(`dilemma ${dilemmaId} is not suitable for the room`);
    this.name = 'DilemmaNotSuitableError';
  }
}
