export class InvalidWorldCountError extends Error {
  constructor(count: number) {
    super(`the answers to an option are a whole number from 0 on, not ${count}`);
    this.name = 'InvalidWorldCountError';
  }
}
