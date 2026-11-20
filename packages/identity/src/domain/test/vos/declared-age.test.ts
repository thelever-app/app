import { describe, expect, it } from 'vitest';
import { InvalidDeclaredAgeError } from '../../errors/invalid-declared-age.error.ts';
import {
  DeclaredAgeVO,
  monthOfBirthAskedFrom,
  needsMonthOfBirth,
} from '../../vos/declared-age.vo.ts';

const ON = new Date('2026-11-19T10:00:00Z');

describe('DeclaredAgeVO', () => {
  describe('constructor', () => {
    it('should reject a year of birth in the future or long ago', () => {
      // Act & Assert
      expect(() => new DeclaredAgeVO(2027, null, ON)).toThrow(InvalidDeclaredAgeError);
      expect(() => new DeclaredAgeVO(1899, null, ON)).toThrow(InvalidDeclaredAgeError);
      expect(() => new DeclaredAgeVO(2000.5, null, ON)).toThrow(InvalidDeclaredAgeError);
    });

    it('should reject a month that does not exist', () => {
      // Act & Assert
      expect(() => new DeclaredAgeVO(2008, 0, ON)).toThrow(InvalidDeclaredAgeError);
      expect(() => new DeclaredAgeVO(2008, 13, ON)).toThrow(InvalidDeclaredAgeError);
    });
  });

  describe('isAtLeast', () => {
    it('should count the whole years from the year of birth', () => {
      // Arrange
      const age = new DeclaredAgeVO(2000, null, ON);

      // Act & Assert
      expect(age.isAtLeast(18, ON)).toBe(true);
    });

    it('should count a birthday from the month after it, since the day is never asked', () => {
      // Arrange: turns 18 in November 2026.
      const age = new DeclaredAgeVO(2008, 11, ON);

      // Act & Assert
      expect(age.isAtLeast(18, ON)).toBe(false);
      expect(age.isAtLeast(18, new Date('2026-12-01T00:00:00Z'))).toBe(true);
    });

    it('should count who gave no month as younger until the year after they turn the age', () => {
      // Arrange: turns 18 at some point of 2026.
      const age = new DeclaredAgeVO(2008, null, ON);

      // Act & Assert
      expect(age.isAtLeast(18, ON)).toBe(false);
      expect(age.isAtLeast(18, new Date('2027-01-01T00:00:00Z'))).toBe(true);
    });
  });
});

describe('needsMonthOfBirth', () => {
  it('should ask for the month of whoever turns 18 this year or later, and never of an adult', () => {
    // Act & Assert
    expect(needsMonthOfBirth(2008, ON)).toBe(true);
    expect(needsMonthOfBirth(2011, ON)).toBe(true);
    expect(needsMonthOfBirth(2020, ON)).toBe(true);
    expect(needsMonthOfBirth(2007, ON)).toBe(false);
    expect(needsMonthOfBirth(1990, ON)).toBe(false);
  });
});

describe('monthOfBirthAskedFrom', () => {
  it('should be the year of birth of whoever turns 18 this year', () => {
    // Act & Assert
    expect(monthOfBirthAskedFrom(ON)).toBe(2008);
    expect(monthOfBirthAskedFrom(new Date('2027-01-01T00:00:00Z'))).toBe(2009);
  });
});
