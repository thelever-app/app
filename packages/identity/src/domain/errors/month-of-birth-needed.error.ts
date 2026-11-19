/** In a boundary year the year alone does not tell whether someone reaches the age (RF-77). */
export class MonthOfBirthNeededError extends Error {
  constructor(birthYear: number) {
    super(`who was born in ${birthYear} must also say the month`);
    this.name = 'MonthOfBirthNeededError';
  }
}
