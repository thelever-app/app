export class UnknownDilemmaTypeError extends Error {
  constructor(type: string) {
    super(`"${type}" is not a dilemma type`);
    this.name = 'UnknownDilemmaTypeError';
  }
}
