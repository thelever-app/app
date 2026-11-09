export class PlayerNotInPredictionSubsetError extends Error {
  constructor(playerId: string, dilemmaId: string) {
    super(`player ${playerId} is not in the prediction subset for dilemma ${dilemmaId}`);
    this.name = 'PlayerNotInPredictionSubsetError';
  }
}
