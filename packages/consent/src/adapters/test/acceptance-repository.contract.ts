import { describe, expect, it } from 'vitest';
import type { AcceptanceRepository } from '../../application/ports/acceptance-repository.port.ts';
import { Acceptances } from '../../domain/entities/acceptances.ts';
import type { PublishedVersions } from '../../domain/vos/legal-document.vo.ts';

const ACCEPTED_AT = new Date('2026-11-19T10:00:00Z');
const PUBLISHED: PublishedVersions = [
  { document: 'terms-of-use', version: 1, asksAgain: true },
  { document: 'terms-of-use', version: 2, asksAgain: false },
  { document: 'game-consent', version: 1, asksAgain: true },
];

/** What every AcceptanceRepository must do, in memory or in PostgreSQL (ADR 0002). */
export function describeAcceptanceRepositoryContract(
  name: string,
  create: () => Promise<AcceptanceRepository>,
): void {
  describe(`${name} (AcceptanceRepository contract)`, () => {
    it('should give an identity that accepted nothing no acceptance', async () => {
      // Arrange
      const repository = await create();

      // Act
      const acceptances = await repository.findByIdentity('TestIdentity');

      // Assert
      expect(acceptances.toSnapshot()).toEqual({ identity: 'TestIdentity', accepted: [] });
    });

    it('should give back what was accepted, with its version and when', async () => {
      // Arrange
      const repository = await create();
      const acceptances = Acceptances.none('TestIdentity');
      acceptances.accept('terms-of-use', 2, PUBLISHED, ACCEPTED_AT);
      acceptances.accept('game-consent', 1, PUBLISHED, ACCEPTED_AT);

      // Act
      await repository.save(acceptances);

      // Assert
      const found = await repository.findByIdentity('TestIdentity');
      expect(found.toSnapshot().accepted).toEqual(
        expect.arrayContaining([
          { document: 'terms-of-use', version: 2, acceptedAt: ACCEPTED_AT, withdrawnAt: null },
          { document: 'game-consent', version: 1, acceptedAt: ACCEPTED_AT, withdrawnAt: null },
        ]),
      );
      expect(found.toSnapshot().accepted).toHaveLength(2);
    });

    it('should keep only the last version of each document', async () => {
      // Arrange
      const repository = await create();
      const first = Acceptances.none('TestIdentity');
      first.accept('game-consent', 1, PUBLISHED, ACCEPTED_AT);
      await repository.save(first);
      const again = await repository.findByIdentity('TestIdentity');
      const later = new Date('2026-12-01T08:00:00Z');
      again.accept('game-consent', 1, PUBLISHED, later);

      // Act
      await repository.save(again);

      // Assert
      expect((await repository.findByIdentity('TestIdentity')).toSnapshot().accepted).toEqual([
        { document: 'game-consent', version: 1, acceptedAt: later, withdrawnAt: null },
      ]);
    });

    it('should not take a document back to a version accepted before', async () => {
      // Arrange: the game consent is given while the new terms are being accepted.
      const repository = await create();
      await repository.save(
        Acceptances.fromSnapshot({
          identity: 'TestIdentity',
          accepted: [
            { document: 'terms-of-use', version: 1, acceptedAt: ACCEPTED_AT, withdrawnAt: null },
          ],
        }),
      );
      const giving = await repository.findByIdentity('TestIdentity');
      const accepting = await repository.findByIdentity('TestIdentity');
      const later = new Date('2026-12-01T08:00:00Z');
      accepting.accept('terms-of-use', 2, PUBLISHED, later);
      await repository.save(accepting);
      giving.accept('game-consent', 1, PUBLISHED, later);

      // Act
      await repository.save(giving);

      // Assert
      expect((await repository.findByIdentity('TestIdentity')).toSnapshot().accepted).toEqual(
        expect.arrayContaining([
          { document: 'terms-of-use', version: 2, acceptedAt: later, withdrawnAt: null },
          { document: 'game-consent', version: 1, acceptedAt: later, withdrawnAt: null },
        ]),
      );
    });

    it('should not lose a withdrawal to a save of what was read before it', async () => {
      // Arrange: the game consent is withdrawn while something else of the same identity is saved.
      const repository = await create();
      const given = Acceptances.none('TestIdentity');
      given.accept('game-consent', 1, PUBLISHED, ACCEPTED_AT);
      await repository.save(given);
      const stale = await repository.findByIdentity('TestIdentity');
      const withdrawing = await repository.findByIdentity('TestIdentity');
      const withdrawn = new Date('2026-12-01T08:00:00Z');
      withdrawing.withdraw('game-consent', withdrawn);
      await repository.save(withdrawing);

      // Act
      await repository.save(stale);

      // Assert
      expect((await repository.findByIdentity('TestIdentity')).toSnapshot().accepted).toEqual([
        { document: 'game-consent', version: 1, acceptedAt: ACCEPTED_AT, withdrawnAt: withdrawn },
      ]);
    });

    it('should keep each identity apart', async () => {
      // Arrange
      const repository = await create();
      const acceptances = Acceptances.none('TestIdentity1');
      acceptances.accept('game-consent', 1, PUBLISHED, ACCEPTED_AT);
      await repository.save(acceptances);

      // Act
      const other = await repository.findByIdentity('TestIdentity2');

      // Assert
      expect(other.toSnapshot().accepted).toEqual([]);
    });
  });
}
