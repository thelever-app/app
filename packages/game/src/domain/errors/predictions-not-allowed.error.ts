export class PredictionsNotAllowedError extends Error {
  constructor() {
    super('an anonymous room only votes, without predictions');
    this.name = 'PredictionsNotAllowedError';
  }
}
