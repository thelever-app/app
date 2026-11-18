export class DistributionPredictionNotAllowedError extends Error {
  constructor() {
    super('a nominal room predicts the vote of each player, not the distribution');
    this.name = 'DistributionPredictionNotAllowedError';
  }
}
