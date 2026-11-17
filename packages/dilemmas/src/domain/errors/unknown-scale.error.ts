export class UnknownScaleError extends Error {
  constructor(scale: string) {
    super(`"${scale}" is not a scale`);
    this.name = 'UnknownScaleError';
  }
}
