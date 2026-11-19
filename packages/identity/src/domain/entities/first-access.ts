import { AgeAlreadyDeclaredError } from '../errors/age-already-declared.error.ts';
import { BlockedCountryError } from '../errors/blocked-country.error.ts';
import { MonthOfBirthNeededError } from '../errors/month-of-birth-needed.error.ts';
import { ADULT_AGE, DeclaredAgeVO, isBoundaryYear } from '../vos/declared-age.vo.ts';
import { minimumAgeIn, type Region, regionOf } from '../vos/region.vo.ts';

export interface FirstAccessSnapshot {
  readonly identity: string;
  readonly region: Region;
  readonly birthYear: number | null;
  /** Only in a boundary year. */
  readonly birthMonth: number | null;
  readonly lastOpenedAt: Date;
}

/**
 * Where the first access of an identity is: stopped in a blocked country, waiting for the age,
 * stopped for good under the minimum age of the region, or past it. The terms and the game
 * consent come after, in Consent.
 */
export type FirstAccessStep = 'blocked-country' | 'age' | 'under-minimum-age' | 'done';

/**
 * The first access of whoever uses the app with an identity: the region of their device, never
 * its address; the age they declared, once and for good (RF-47); and when they last opened the
 * app, which the deletion after 24 months without opening it counts from (RES-39).
 */
export class FirstAccess {
  readonly #identity: string;
  readonly #region: Region;
  #age: DeclaredAgeVO | undefined;
  #lastOpenedAt: Date;

  private constructor(
    identity: string,
    region: Region,
    age: DeclaredAgeVO | undefined,
    lastOpenedAt: Date,
  ) {
    this.#identity = identity;
    this.#region = region;
    this.#age = age;
    this.#lastOpenedAt = lastOpenedAt;
  }

  /** The first time the app opens with this identity, in the country its address is in. */
  static begin({
    identity,
    country,
    now,
  }: {
    readonly identity: string;
    readonly country: string | undefined;
    readonly now: Date;
  }): FirstAccess {
    return new FirstAccess(identity, regionOf(country), undefined, now);
  }

  static fromSnapshot(snapshot: FirstAccessSnapshot): FirstAccess {
    const { identity, region, birthYear, birthMonth, lastOpenedAt } = snapshot;
    const age =
      birthYear === null ? undefined : new DeclaredAgeVO(birthYear, birthMonth, lastOpenedAt);
    return new FirstAccess(identity, region, age, lastOpenedAt);
  }

  get identity(): string {
    return this.#identity;
  }

  get region(): Region {
    return this.#region;
  }

  open(now: Date): void {
    this.#lastOpenedAt = now;
  }

  /**
   * The year of birth, and the month only in a boundary year, where it is asked for; a month given
   * in any other year is not kept. Under the minimum age the first access stops there for good.
   */
  declareAge(birthYear: number, birthMonth: number | undefined, now: Date): void {
    if (this.#age) throw new AgeAlreadyDeclaredError(this.#identity);
    if (this.#region === 'blocked') throw new BlockedCountryError(this.#identity);
    const boundary = isBoundaryYear(birthYear, minimumAgeIn(this.#region), now);
    if (boundary && birthMonth === undefined) throw new MonthOfBirthNeededError(birthYear);
    this.#age = new DeclaredAgeVO(birthYear, boundary ? (birthMonth ?? null) : null, now);
  }

  step(now: Date): FirstAccessStep {
    if (this.#region === 'blocked') return 'blocked-country';
    if (!this.#age) return 'age';
    return this.#age.isAtLeast(minimumAgeIn(this.#region), now) ? 'done' : 'under-minimum-age';
  }

  /** Who has not declared the age yet counts as under 18, which is what protects them. */
  isUnderEighteen(now: Date): boolean {
    return !this.#age?.isAtLeast(ADULT_AGE, now);
  }

  toSnapshot(): FirstAccessSnapshot {
    return {
      identity: this.#identity,
      region: this.#region,
      birthYear: this.#age?.birthYear ?? null,
      birthMonth: this.#age?.birthMonth ?? null,
      lastOpenedAt: this.#lastOpenedAt,
    };
  }
}
