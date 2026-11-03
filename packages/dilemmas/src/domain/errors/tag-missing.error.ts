import { MissingArgumentError } from './missing-argument.error.ts';

export class TagMissingError extends MissingArgumentError {
  constructor() {
    super('tag');
    this.name = 'TagMissingError';
  }
}
