export class InvalidMinimumAgeError extends Error {
  constructor(age: number) {
    super(`the minimum age is 16 or 18, not ${age}`);
    this.name = 'InvalidMinimumAgeError';
  }
}
