export class HostCannotBeExpelledError extends Error {
  constructor() {
    super('the host cannot be expelled');
    this.name = 'HostCannotBeExpelledError';
  }
}
