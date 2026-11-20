import { InvalidDeclaredAgeError } from '../errors/invalid-declared-age.error.ts';

/** The oldest year of birth a person can declare. */
const EARLIEST_BIRTH_YEAR = 1900;

/** The age of a legal adult, which decides the dilemmas for adults and the rooms for adults. */
export const ADULT_AGE = 18;

/**
 * The year of birth someone declared in the first access and, only while they may be under 18,
 * the month. The day is never asked.
 */
export class DeclaredAgeVO {
  readonly birthYear: number;
  readonly birthMonth: number | null;

  constructor(birthYear: number, birthMonth: number | null, on: Date) {
    const valid =
      Number.isInteger(birthYear) &&
      birthYear >= EARLIEST_BIRTH_YEAR &&
      birthYear <= on.getUTCFullYear() &&
      (birthMonth === null ||
        (Number.isInteger(birthMonth) && birthMonth >= 1 && birthMonth <= 12));
    if (!valid) throw new InvalidDeclaredAgeError(birthYear, birthMonth);
    this.birthYear = birthYear;
    this.birthMonth = birthMonth;
  }

  /**
   * Whether the person is at least that old on that day. A birthday counts from the first day of
   * the month after it, since the day is never asked; without the month, from the first of January
   * after the year in which they turn that age.
   */
  isAtLeast(years: number, on: Date): boolean {
    const year = on.getUTCFullYear();
    const turns = this.birthYear + years;
    if (year !== turns) return year > turns;
    return this.birthMonth !== null && on.getUTCMonth() + 1 > this.birthMonth;
  }
}

/**
 * Whether the month is asked for who was born that year: whoever turns 18 this year or later may
 * still be under 18, and without the month they would wait until the first of January after the
 * year they reach an age, when they may reach it a month after their birthday. Adults never give it.
 */
export function needsMonthOfBirth(birthYear: number, on: Date): boolean {
  return birthYear >= monthOfBirthAskedFrom(on);
}

/** The earliest year of birth for which the month is asked: that of whoever turns 18 this year. */
export function monthOfBirthAskedFrom(on: Date): number {
  return on.getUTCFullYear() - ADULT_AGE;
}
