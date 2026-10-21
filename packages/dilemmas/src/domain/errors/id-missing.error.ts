import { MissingArgumentError } from './missing-argument.error.ts';

export class IdMissingError extends MissingArgumentError {
  constructor() {
    super('id');
    this.name = 'IdMissingError';
  }
}
