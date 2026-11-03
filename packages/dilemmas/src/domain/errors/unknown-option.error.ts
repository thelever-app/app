export class UnknownOptionError extends Error {
  constructor(optionId: string) {
    super(`option ${optionId} is not an option of the dilemma`);
    this.name = 'UnknownOptionError';
  }
}
