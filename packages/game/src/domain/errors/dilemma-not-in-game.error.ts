export class DilemmaNotInGameError extends Error {
  constructor(dilemmaId: string) {
    super(`dilemma ${dilemmaId} is not in the game`);
    this.name = 'DilemmaNotInGameError';
  }
}
