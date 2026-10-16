import { MissingArgumentError } from './missing-argument.error.ts';

export class NicknameMissingError extends MissingArgumentError {
  constructor() {
    super('nickname');
    this.name = 'NicknameMissingError';
  }
}
