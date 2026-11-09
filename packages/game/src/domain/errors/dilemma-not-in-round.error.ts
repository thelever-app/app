export class DilemmaNotInRoundError extends Error {
  constructor(dilemmaId: string) {
    super(`dilemma ${dilemmaId} is not the dilemma of the round in progress`);
    this.name = 'DilemmaNotInRoundError';
  }
}
