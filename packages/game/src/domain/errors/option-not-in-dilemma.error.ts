export class OptionNotInDilemmaError extends Error {
  constructor(optionId: string, dilemmaId: string) {
    super(`option ${optionId} is not an option of dilemma ${dilemmaId}`);
    this.name = 'OptionNotInDilemmaError';
  }
}
