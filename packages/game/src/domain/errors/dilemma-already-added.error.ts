export class DilemmaAlreadyAddedError extends Error {
  constructor(playerId: string) {
    super(`player ${playerId} has already added a dilemma`);
    this.name = 'DilemmaAlreadyAddedError';
  }
}
