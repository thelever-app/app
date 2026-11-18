export class InvalidDistributionPredictionError extends Error {
  constructor(reason: string) {
    super(`a distribution prediction ${reason}`);
    this.name = 'InvalidDistributionPredictionError';
  }
}
