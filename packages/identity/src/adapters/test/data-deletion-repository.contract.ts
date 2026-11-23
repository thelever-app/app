import { describe, expect, it } from 'vitest';
import type { DataDeletionRepository } from '../../application/ports/data-deletion-repository.port.ts';
import { DataDeletion, type DeletionReason } from '../../domain/entities/data-deletion.ts';

function deletion(
  id: string,
  identity: string,
  requestedAt: string,
  reason: DeletionReason = 'request',
): DataDeletion {
  return DataDeletion.request({ id, identity, reason, now: new Date(requestedAt) });
}

/** What every DataDeletionRepository must do, in memory or in PostgreSQL (ADR 0002). */
export function describeDataDeletionRepositoryContract(
  name: string,
  create: () => Promise<DataDeletionRepository>,
): void {
  describe(`${name} (DataDeletionRepository contract)`, () => {
    it('should give back a deletion as it was saved', async () => {
      // Arrange
      const repository = await create();
      const saved = deletion(
        '00000000-0000-4000-8000-000000000001',
        'TestIdentity',
        '2026-11-23T10:00:00Z',
        'game-consent-withdrawn',
      );
      saved.erased(new Date('2026-11-23T10:00:00Z'));

      // Act
      await repository.save(saved);

      // Assert
      const found = await repository.findById('00000000-0000-4000-8000-000000000001');
      expect(found?.toSnapshot()).toEqual(saved.toSnapshot());
    });

    it('should give the pending ones, oldest first, and all of them after a restore', async () => {
      // Arrange
      const repository = await create();
      const done = deletion(
        '00000000-0000-4000-8000-000000000001',
        'TestIdentity1',
        '2026-11-20T10:00:00Z',
      );
      done.erased(new Date('2026-11-21T03:00:00Z'));
      await repository.save(
        deletion('00000000-0000-4000-8000-000000000002', 'TestIdentity2', '2026-11-23T10:00:00Z'),
      );
      await repository.save(done);
      await repository.save(
        deletion('00000000-0000-4000-8000-000000000003', 'TestIdentity3', '2026-11-22T10:00:00Z'),
      );

      // Act
      const pending = await repository.pending();
      const all = await repository.all();

      // Assert
      expect(pending.map(({ identity }) => identity)).toEqual(['TestIdentity3', 'TestIdentity2']);
      expect(all.map(({ identity }) => identity)).toEqual([
        'TestIdentity1',
        'TestIdentity3',
        'TestIdentity2',
      ]);
    });

    it('should replace a deletion once it is erased', async () => {
      // Arrange
      const repository = await create();
      const saved = deletion(
        '00000000-0000-4000-8000-000000000001',
        'TestIdentity',
        '2026-11-23T10:00:00Z',
      );
      await repository.save(saved);
      saved.erased(new Date('2026-11-24T03:00:00Z'));

      // Act
      await repository.save(saved);

      // Assert
      expect(await repository.pending()).toEqual([]);
      expect((await repository.all()).map((kept) => kept.toSnapshot())).toEqual([
        saved.toSnapshot(),
      ]);
    });

    it('should give the deletions of one identity', async () => {
      // Arrange
      const repository = await create();
      await repository.save(
        deletion('00000000-0000-4000-8000-000000000001', 'TestIdentity1', '2026-11-23T10:00:00Z'),
      );
      await repository.save(
        deletion('00000000-0000-4000-8000-000000000002', 'TestIdentity2', '2026-11-23T11:00:00Z'),
      );

      // Act
      const found = await repository.ofIdentity('TestIdentity2');

      // Assert
      expect(found.map(({ id }) => id)).toEqual(['00000000-0000-4000-8000-000000000002']);
    });
  });
}
