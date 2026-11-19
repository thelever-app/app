import { describe, expect, it } from 'vitest';
import type { FirstAccessRepository } from '../../application/ports/first-access-repository.port.ts';
import { FirstAccess } from '../../domain/entities/first-access.ts';

const OPENED = new Date('2026-11-19T10:00:00Z');

async function foundIn(repository: FirstAccessRepository): Promise<FirstAccess> {
  const found = await repository.findByIdentity('TestIdentity');
  if (!found) throw new Error('TestIdentity has no first access');
  return found;
}

/** What every FirstAccessRepository must do, in memory or in PostgreSQL (ADR 0002). */
export function describeFirstAccessRepositoryContract(
  name: string,
  create: () => Promise<FirstAccessRepository>,
): void {
  describe(`${name} (FirstAccessRepository contract)`, () => {
    it('should find nothing for an identity that never opened the app', async () => {
      // Arrange
      const repository = await create();

      // Act & Assert
      expect(await repository.findByIdentity('TestIdentity')).toBeUndefined();
    });

    it('should give back the first access as it was saved', async () => {
      // Arrange
      const repository = await create();
      const firstAccess = FirstAccess.begin({
        identity: 'TestIdentity',
        country: 'ES',
        now: OPENED,
      });
      firstAccess.declareAge(2010, 3, OPENED);

      // Act
      await repository.save(firstAccess);

      // Assert
      const found = await repository.findByIdentity('TestIdentity');
      expect(found?.toSnapshot()).toEqual(firstAccess.toSnapshot());
    });

    it('should replace the first access of the same identity', async () => {
      // Arrange
      const repository = await create();
      const firstAccess = FirstAccess.begin({
        identity: 'TestIdentity',
        country: 'US',
        now: OPENED,
      });
      await repository.save(firstAccess);
      const later = new Date('2026-12-01T08:30:00Z');
      firstAccess.open(later, 'US');
      firstAccess.declareAge(1990, undefined, later);

      // Act
      await repository.save(firstAccess);

      // Assert
      const found = await repository.findByIdentity('TestIdentity');
      expect(found?.toSnapshot()).toEqual({
        identity: 'TestIdentity',
        region: 'rest-of-world',
        birthYear: 1990,
        birthMonth: null,
        lastOpenedAt: later,
      });
    });

    it('should not lose the declared age to a save of what was read before it', async () => {
      // Arrange: the app opens again while the age is being declared.
      const repository = await create();
      await repository.save(
        FirstAccess.begin({ identity: 'TestIdentity', country: 'ES', now: OPENED }),
      );
      const reopened = await foundIn(repository);
      const declaring = await foundIn(repository);
      declaring.declareAge(1990, undefined, OPENED);
      await repository.save(declaring);
      const later = new Date('2026-11-19T10:00:05Z');
      reopened.open(later, 'ES');

      // Act
      await repository.save(reopened);

      // Assert
      const found = await repository.findByIdentity('TestIdentity');
      expect(found?.toSnapshot()).toEqual({
        identity: 'TestIdentity',
        region: 'eea',
        birthYear: 1990,
        birthMonth: null,
        lastOpenedAt: later,
      });
    });

    it('should keep each identity apart', async () => {
      // Arrange
      const repository = await create();
      await repository.save(
        FirstAccess.begin({ identity: 'TestIdentity1', country: 'ES', now: OPENED }),
      );
      await repository.save(
        FirstAccess.begin({ identity: 'TestIdentity2', country: 'GB', now: OPENED }),
      );

      // Act
      const first = await repository.findByIdentity('TestIdentity1');

      // Assert
      expect(first?.region).toBe('eea');
    });
  });
}
