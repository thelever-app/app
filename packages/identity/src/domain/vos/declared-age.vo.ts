import { InvalidDeclaredAgeError } from '../errors/invalid-declared-age.error.ts';

/** The oldest year of birth a person can declare. */
const EARLIEST_BIRTH_YEAR = 1900;

/** The age of a legal adult, which decides the dilemmas for adults and the rooms for adults. */
export const ADULT_AGE = 18;

/**
 * The year of birth someone declared in the first access and, only in a boundary year, the month.
 * The day is never asked.
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
 * Whether who was born that year turns the minimum age of their region, or 18, this year: the
 * month is asked only then.
 */
export function isBoundaryYear(birthYear: number, minimumAge: number, on: Date): boolean {
  const turns = on.getUTCFullYear() - birthYear;
  return turns === minimumAge || turns === ADULT_AGE;
}
