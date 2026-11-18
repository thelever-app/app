export class DilemmaAlreadyPlayedError extends Error {
  constructor(dilemmaId: string) {
    super(`dilemma ${dilemmaId} was already played in this room`);
    this.name = 'DilemmaAlreadyPlayedError';
  }
}
