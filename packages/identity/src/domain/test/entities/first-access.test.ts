import { describe, expect, it } from 'vitest';
import { FirstAccess } from '../../entities/first-access.ts';
import { AgeAlreadyDeclaredError } from '../../errors/age-already-declared.error.ts';
import { BlockedCountryError } from '../../errors/blocked-country.error.ts';
import { MonthOfBirthNeededError } from '../../errors/month-of-birth-needed.error.ts';
import { RequestCodeVO } from '../../vos/request-code.vo.ts';

const NOW = new Date('2026-11-19T10:00:00Z');

const REQUEST_CODE = RequestCodeVO.parse('K7Q4-MD2X-9PRT');

function begun(country: string | undefined): FirstAccess {
  if (!REQUEST_CODE) throw new Error('K7Q4-MD2X-9PRT is a request code');
  return FirstAccess.begin({ identity: 'uid-ana', country, now: NOW, requestCode: REQUEST_CODE });
}

describe('FirstAccess', () => {
  describe('begin', () => {
    it('should keep only the region of the country, when the app was opened and its request code', () => {
      // Act
      const firstAccess = begun('ES');

      // Assert
      expect(firstAccess.toSnapshot()).toEqual({
        identity: 'uid-ana',
        region: 'eea',
        birthYear: null,
        birthMonth: null,
        lastOpenedAt: NOW,
        requestCode: 'K7Q4MD2X9PRT',
      });
    });

    it('should ask for the age first', () => {
      // Act & Assert
      expect(begun('ES').step(NOW)).toBe('age');
    });

    it('should stop at the blocked country', () => {
      // Act & Assert
      expect(begun('GB').step(NOW)).toBe('blocked-country');
    });
  });

  describe('open', () => {
    it('should remember the last time the app was opened', () => {
      // Arrange
      const firstAccess = begun('ES');
      const later = new Date('2026-12-01T09:00:00Z');

      // Act
      firstAccess.open(later, 'ES');

      // Assert
      expect(firstAccess.toSnapshot().lastOpenedAt).toEqual(later);
    });

    it('should keep the region of the first time between the EEA and the rest of the world', () => {
      // Arrange
      const firstAccess = begun('ES');

      // Act
      firstAccess.open(NOW, 'US');

      // Assert
      expect(firstAccess.region).toBe('eea');
    });

    it('should stop whoever opens it in a blocked country, wherever it was opened first', () => {
      // Arrange
      const firstAccess = begun('ES');
      firstAccess.declareAge(1990, undefined, NOW);

      // Act
      firstAccess.open(NOW, 'RU');

      // Assert
      expect(firstAccess.step(NOW)).toBe('blocked-country');
    });

    it('should take the region of where it is opened once out of a blocked country', () => {
      // Arrange
      const firstAccess = begun('GB');

      // Act
      firstAccess.open(NOW, 'ES');

      // Assert
      expect(firstAccess.region).toBe('eea');
      expect(firstAccess.step(NOW)).toBe('age');
    });
  });

  describe('declareAge', () => {
    it('should let in who reaches the minimum age of the region', () => {
      // Arrange
      const firstAccess = begun('ES');

      // Act
      firstAccess.declareAge(2009, 5, NOW);

      // Assert: 17 in 2026, and 16 is enough in the EEA.
      expect(firstAccess.step(NOW)).toBe('done');
    });

    it('should stop for good who is under the minimum age of the region', () => {
      // Arrange
      const firstAccess = begun('US');

      // Act
      firstAccess.declareAge(2009, 5, NOW);

      // Assert: 17 in 2026, and 18 is needed out of the EEA.
      expect(firstAccess.step(NOW)).toBe('under-minimum-age');
    });

    it('should ask for the month of who may be under 18', () => {
      // Arrange
      const firstAccess = begun('ES');

      // Act & Assert: who turns 15 in 2026.
      expect(() => firstAccess.declareAge(2011, undefined, NOW)).toThrow(MonthOfBirthNeededError);
      expect(firstAccess.step(NOW)).toBe('age');
    });

    it('should let in who was under the minimum age from the month after they reach it', () => {
      // Arrange: 15 in November 2026, and turns 16 in February 2027.
      const firstAccess = begun('ES');
      firstAccess.declareAge(2011, 2, NOW);

      // Act & Assert
      expect(firstAccess.step(new Date('2027-02-15T10:00:00Z'))).toBe('under-minimum-age');
      expect(firstAccess.step(new Date('2027-03-01T10:00:00Z'))).toBe('done');
    });

    it('should decide with the month in the year they reach the age', () => {
      // Arrange
      const before = begun('ES');
      const after = begun('ES');

      // Act: turns 16 in March, or in December.
      before.declareAge(2010, 3, NOW);
      after.declareAge(2010, 12, NOW);

      // Assert
      expect(before.step(NOW)).toBe('done');
      expect(after.step(NOW)).toBe('under-minimum-age');
    });

    it('should not keep a month that was not needed', () => {
      // Arrange
      const firstAccess = begun('ES');

      // Act
      firstAccess.declareAge(1990, 4, NOW);

      // Assert
      expect(firstAccess.toSnapshot()).toMatchObject({ birthYear: 1990, birthMonth: null });
    });

    it('should never let the age be declared again', () => {
      // Arrange
      const firstAccess = begun('US');
      firstAccess.declareAge(2009, 5, NOW);

      // Act & Assert
      expect(() => firstAccess.declareAge(1990, undefined, NOW)).toThrow(AgeAlreadyDeclaredError);
    });

    it('should not take an age in a blocked country', () => {
      // Arrange
      const firstAccess = begun('GB');

      // Act & Assert
      expect(() => firstAccess.declareAge(1990, undefined, NOW)).toThrow(BlockedCountryError);
    });
  });

  describe('isUnderEighteen', () => {
    it('should count as under 18 who has not declared the age yet', () => {
      // Act & Assert
      expect(begun('ES').isUnderEighteen(NOW)).toBe(true);
    });

    it('should tell an adult from a minor by the declared age', () => {
      // Arrange
      const adult = begun('ES');
      const minor = begun('ES');
      adult.declareAge(1990, undefined, NOW);
      minor.declareAge(2009, 5, NOW);

      // Act & Assert
      expect(adult.isUnderEighteen(NOW)).toBe(false);
      expect(minor.isUnderEighteen(NOW)).toBe(true);
    });

    it('should stop counting as under 18 from the month after the birthday', () => {
      // Arrange: turns 18 in November 2026.
      const firstAccess = begun('ES');
      firstAccess.declareAge(2008, 11, NOW);

      // Act & Assert
      expect(firstAccess.isUnderEighteen(NOW)).toBe(true);
      expect(firstAccess.isUnderEighteen(new Date('2026-12-01T00:00:00Z'))).toBe(false);
    });
  });

  describe('fromSnapshot', () => {
    it('should come back as it was kept', () => {
      // Arrange
      const firstAccess = begun('ES');
      firstAccess.declareAge(2008, 3, NOW);

      // Act
      const again = FirstAccess.fromSnapshot(firstAccess.toSnapshot());

      // Assert
      expect(again.toSnapshot()).toEqual(firstAccess.toSnapshot());
    });
  });
});
