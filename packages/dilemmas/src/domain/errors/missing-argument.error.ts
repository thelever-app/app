export class MissingArgumentError extends Error {
  constructor(argumentName: string) {
    super(`${argumentName} is missing`);
    this.name = 'MissingArgumentError';
  }
}
