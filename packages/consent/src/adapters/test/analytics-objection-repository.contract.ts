import { describe, expect, it } from 'vitest';
import type { AnalyticsObjectionRepository } from '../../application/ports/analytics-objection-repository.port.ts';

const OBJECTED = new Date('2026-11-23T10:00:00Z');

/** What every AnalyticsObjectionRepository must do, in memory or in PostgreSQL (ADR 0002). */
export function describeAnalyticsObjectionRepositoryContract(
  name: string,
  create: () => Promise<AnalyticsObjectionRepository>,
): void {
  describe(`${name} (AnalyticsObjectionRepository contract)`, () => {
    it('should know of no objection of who never objected', async () => {
      // Arrange
      const repository = await create();

      // Act & Assert
      expect(await repository.objectedAt('TestIdentity')).toBeUndefined();
    });

    it('should keep the first time an identity objected', async () => {
      // Arrange
      const repository = await create();
      await repository.object('TestIdentity', OBJECTED);

      // Act
      await repository.object('TestIdentity', new Date('2026-11-24T10:00:00Z'));

      // Assert
      expect(await repository.objectedAt('TestIdentity')).toEqual(OBJECTED);
    });

    it('should forget the objection once it is lifted, and only that one', async () => {
      // Arrange
      const repository = await create();
      await repository.object('TestIdentity1', OBJECTED);
      await repository.object('TestIdentity2', OBJECTED);

      // Act
      await repository.lift('TestIdentity1');

      // Assert
      expect(await repository.objectedAt('TestIdentity1')).toBeUndefined();
      expect(await repository.objectedAt('TestIdentity2')).toEqual(OBJECTED);
    });
  });
}
