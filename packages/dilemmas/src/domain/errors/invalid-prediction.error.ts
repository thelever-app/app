export class InvalidPredictionError extends Error {
  constructor(prediction: number) {
    super(`a prediction is a whole percentage from 0 to 100, not ${prediction}`);
    this.name = 'InvalidPredictionError';
  }
}
