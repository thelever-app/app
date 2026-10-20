export class DuplicateOptionError extends Error {
  constructor(text: string) {
    super(`the option "${text}" is repeated`);
    this.name = 'DuplicateOptionError';
  }
}
