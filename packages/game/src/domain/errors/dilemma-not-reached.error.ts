export class DilemmaNotReachedError extends Error {
  constructor(dilemmaId: string) {
    super(`dilemma ${dilemmaId} comes after a dilemma the player has not answered`);
    this.name = 'DilemmaNotReachedError';
  }
}
