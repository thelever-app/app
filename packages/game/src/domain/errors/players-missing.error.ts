import { MissingArgumentError } from './missing-argument.error.ts';

export class PlayersMissingError extends MissingArgumentError {
  constructor() {
    super('players');
    this.name = 'PlayersMissingError';
  }
}
