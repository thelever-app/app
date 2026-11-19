/** For who may be under 18, the year alone does not tell when they reach an age. */
export class MonthOfBirthNeededError extends Error {
  constructor(birthYear: number) {
    super(`who was born in ${birthYear} must also say the month`);
    this.name = 'MonthOfBirthNeededError';
  }
}
