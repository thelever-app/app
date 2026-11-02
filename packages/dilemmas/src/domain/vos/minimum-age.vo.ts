import { InvalidMinimumAgeError } from '../errors/invalid-minimum-age.error.ts';

export const MINIMUM_AGES = [16, 18] as const;

export type MinimumAge = (typeof MINIMUM_AGES)[number];

/** The age a player needs to get the dilemma: a player under 18 only gets those suitable from 16. */
export class MinimumAgeVO {
  readonly value: MinimumAge;

  constructor(value: number) {
    const age = MINIMUM_AGES.find((candidate) => candidate === value);
    if (age === undefined) {
      throw new InvalidMinimumAgeError(value);
    }
    this.value = age;
  }

  /** Whether a player under 18 may get the dilemma. */
  isSuitableForMinors(): boolean {
    return this.value === 16;
  }
}
