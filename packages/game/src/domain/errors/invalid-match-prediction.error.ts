export class InvalidMatchPredictionError extends Error {
  constructor(matchPrediction: number, otherPlayers: number) {
    super(
      `a match prediction of ${matchPrediction} is not between 0 and the ${otherPlayers} other players`,
    );
    this.name = 'InvalidMatchPredictionError';
  }
}
