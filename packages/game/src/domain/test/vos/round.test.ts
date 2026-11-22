import { describe, expect, it } from 'vitest';
import { isAnyContent, isOfContent } from '../../vos/round.vo.ts';

/** Test data: a dilemma of each age, compromising or not. */
const MILD = { minimumAge: 16, compromising: false };
const ADULT = { minimumAge: 18, compromising: false };
const COMPROMISING = { minimumAge: 16, compromising: true };
const ADULT_COMPROMISING = { minimumAge: 18, compromising: true };

describe('isOfContent', () => {
  it('should take every dilemma for any content', () => {
    // Act & Assert
    for (const dilemma of [MILD, ADULT, COMPROMISING, ADULT_COMPROMISING]) {
      expect(isOfContent(dilemma, { age: 'any', compromising: 'any' })).toBe(true);
    }
  });

  it.each([
    { age: 'from-16', taken: [MILD, COMPROMISING] },
    { age: 'adults-only', taken: [ADULT, ADULT_COMPROMISING] },
  ] as const)('should take only the dilemmas of its minimum age for $age', ({ age, taken }) => {
    // Act
    const found = [MILD, ADULT, COMPROMISING, ADULT_COMPROMISING].filter((dilemma) =>
      isOfContent(dilemma, { age, compromising: 'any' }),
    );

    // Assert
    expect(found).toEqual(taken);
  });

  it.each([
    { compromising: 'yes', taken: [COMPROMISING, ADULT_COMPROMISING] },
    { compromising: 'no', taken: [MILD, ADULT] },
  ] as const)(
    'should take only the dilemmas compromising or not for $compromising',
    ({ compromising, taken }) => {
      // Act
      const found = [MILD, ADULT, COMPROMISING, ADULT_COMPROMISING].filter((dilemma) =>
        isOfContent(dilemma, { age: 'any', compromising }),
      );

      // Assert
      expect(found).toEqual(taken);
    },
  );

  it('should ask both of a dilemma when the round asks for both', () => {
    // Act & Assert
    expect(isOfContent(ADULT_COMPROMISING, { age: 'adults-only', compromising: 'yes' })).toBe(true);
    expect(isOfContent(ADULT, { age: 'adults-only', compromising: 'yes' })).toBe(false);
    expect(isOfContent(COMPROMISING, { age: 'adults-only', compromising: 'yes' })).toBe(false);
  });
});

describe('isAnyContent', () => {
  it('should be any content only with any age and any compromising', () => {
    // Act & Assert
    expect(isAnyContent({ age: 'any', compromising: 'any' })).toBe(true);
    expect(isAnyContent({ age: 'from-16', compromising: 'any' })).toBe(false);
    expect(isAnyContent({ age: 'any', compromising: 'no' })).toBe(false);
  });
});
