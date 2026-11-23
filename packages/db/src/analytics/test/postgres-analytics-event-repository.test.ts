import type { AnalyticsEvent } from '@thelever-app/analytics';
import { describeAnalyticsEventRepositoryContract } from '@thelever-app/analytics/contracts';
import { describe, expect, it } from 'vitest';
import type { Database } from '../../schema.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { inTransaction } from '../../transaction.ts';
import { PostgresAnalyticsEventRepository } from '../postgres-analytics-event-repository.ts';

const database = useTestDatabase<Database>();

describeAnalyticsEventRepositoryContract('PostgresAnalyticsEventRepository', async () => {
  await emptyTables(database.db());
  return new PostgresAnalyticsEventRepository(database.db());
});

function eventOf(id: string): AnalyticsEvent {
  return {
    id,
    identity: 'identity-1',
    occurredAt: new Date('2026-11-23T10:00:00Z'),
    fact: { kind: 'room-created', roomId: 'room-1' },
  };
}

describe('PostgresAnalyticsEventRepository inside a command', () => {
  it('should keep the command going when recording an event fails', async () => {
    await emptyTables(database.db());
    const repository = new PostgresAnalyticsEventRepository(database.db());

    await inTransaction(database.db(), async () => {
      await repository.record(eventOf('event-1'));
      await expect(repository.record(eventOf('event-1'))).rejects.toThrow();
      await repository.record(eventOf('event-2'));
    });

    const kept = await repository.ofIdentity('identity-1');
    expect(kept.map(({ id }) => id)).toEqual(['event-1', 'event-2']);
  });
});
