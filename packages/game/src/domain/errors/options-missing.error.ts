import { MissingArgumentError } from './missing-argument.error.ts';

export class OptionsMissingError extends MissingArgumentError {
  constructor(dilemmaId: string) {
    super(`options of dilemma ${dilemmaId}`);
    this.name = 'OptionsMissingError';
  }
}
