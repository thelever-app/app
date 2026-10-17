import { MissingArgumentError } from './missing-argument.error.ts';

export class VoteMissingError extends MissingArgumentError {
  constructor() {
    super('vote');
    this.name = 'VoteMissingError';
  }
}
