export class NoNextRoundError extends Error {
  constructor() {
    super('the round in progress is the last one of the game');
    this.name = 'NoNextRoundError';
  }
}
