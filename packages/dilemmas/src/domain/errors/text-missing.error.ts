import { MissingArgumentError } from './missing-argument.error.ts';

export class TextMissingError extends MissingArgumentError {
  constructor() {
    super('text');
    this.name = 'TextMissingError';
  }
}
