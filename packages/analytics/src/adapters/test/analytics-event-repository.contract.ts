import { describe, expect, it } from 'vitest';
import type { AnalyticsEventRepository } from '../../application/ports/analytics-event-repository.port.ts';
import type { AnalyticsEvent } from '../../domain/entities/analytics-event.ts';

const FIRST_VISIT: AnalyticsEvent = {
  id: '00000000-0000-4000-8000-000000000001',
  identity: 'TestIdentity1',
  occurredAt: new Date('2026-11-23T10:00:00Z'),
  fact: {
    kind: 'first-visit',
    origin: { source: 'cartel', campaign: 'bares', content: 'tinder', ref: null },
  },
};

const GAME_STARTED: AnalyticsEvent = {
  id: '00000000-0000-4000-8000-000000000002',
  identity: 'TestIdentity1',
  occurredAt: new Date('2026-11-23T10:30:00Z'),
  fact: {
    kind: 'game-started',
    roomId: '00000000-0000-4000-8000-0000000000aa',
    gameId: '00000000-0000-4000-8000-0000000000bb',
    players: 4,
  },
};

/** What every AnalyticsEventRepository must do, in memory or in PostgreSQL (ADR 0002). */
export function describeAnalyticsEventRepositoryContract(
  name: string,
  create: () => Promise<AnalyticsEventRepository>,
): void {
  describe(`${name} (AnalyticsEventRepository contract)`, () => {
    it('should give back the events of an identity as they were recorded, oldest first', async () => {
      // Arrange
      const repository = await create();
      await repository.record(GAME_STARTED);
      await repository.record(FIRST_VISIT);
      await repository.record({
        ...FIRST_VISIT,
        id: '00000000-0000-4000-8000-000000000003',
        identity: 'TestIdentity2',
      });

      // Act
      const events = await repository.ofIdentity('TestIdentity1');

      // Assert
      expect(events).toEqual([FIRST_VISIT, GAME_STARTED]);
    });

    it('should know whether an identity has an event of a kind', async () => {
      // Arrange
      const repository = await create();
      await repository.record(GAME_STARTED);

      // Act & Assert
      expect(await repository.has('TestIdentity1', 'game-started')).toBe(true);
      expect(await repository.has('TestIdentity1', 'first-visit')).toBe(false);
    });

    it('should erase every event of an identity, and only of it', async () => {
      // Arrange
      const repository = await create();
      await repository.record(FIRST_VISIT);
      await repository.record(GAME_STARTED);
      await repository.record({
        ...FIRST_VISIT,
        id: '00000000-0000-4000-8000-000000000003',
        identity: 'TestIdentity2',
      });

      // Act
      await repository.erase('TestIdentity1');

      // Assert
      expect(await repository.ofIdentity('TestIdentity1')).toEqual([]);
      expect(await repository.ofIdentity('TestIdentity2')).toHaveLength(1);
    });
  });
}
