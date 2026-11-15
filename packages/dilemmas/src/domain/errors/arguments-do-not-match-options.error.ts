export class ArgumentsDoNotMatchOptionsError extends Error {
  constructor(dilemmaId: string) {
    super(`the arguments of dilemma ${dilemmaId} must be one for each of its options`);
    this.name = 'ArgumentsDoNotMatchOptionsError';
  }
}
