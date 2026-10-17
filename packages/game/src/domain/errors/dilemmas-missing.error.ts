import { MissingArgumentError } from './missing-argument.error.ts';

export class DilemmasMissingError extends MissingArgumentError {
  constructor() {
    super('dilemmas');
    this.name = 'DilemmasMissingError';
  }
}
