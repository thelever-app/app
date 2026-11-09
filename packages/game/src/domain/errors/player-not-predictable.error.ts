export class PlayerNotPredictableError extends Error {
  constructor(playerId: string) {
    super(`player ${playerId} is not one whose vote can be predicted in this game`);
    this.name = 'PlayerNotPredictableError';
  }
}
