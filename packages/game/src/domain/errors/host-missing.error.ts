import { MissingArgumentError } from './missing-argument.error.ts';

export class HostMissingError extends MissingArgumentError {
  constructor() {
    super('host');
    this.name = 'HostMissingError';
  }
}
