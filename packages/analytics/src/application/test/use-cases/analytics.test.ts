import { describe, expect, it } from 'vitest';
import { InMemoryAnalyticsEventRepository } from '../../../adapters/in-memory/in-memory-analytics-event-repository.ts';
import type { AnalyticsFact } from '../../../domain/entities/analytics-event.ts';
import {
  EraseAnalyticsDataUseCase,
  ExportAnalyticsDataUseCase,
} from '../../use-cases/analytics-personal-data.use-case.ts';
import { RecordAnalyticsEventUseCase } from '../../use-cases/record-analytics-event.use-case.ts';

const FIRST_VISIT: AnalyticsFact = {
  kind: 'first-visit',
  origin: { source: 'cartel', campaign: 'bares', content: 'tinder', ref: null },
};

function setUp() {
  const events = new InMemoryAnalyticsEventRepository();
  const objecting = new Set<string>();
  let next = 0;
  const ids = { generate: () => `event-${++next}` };
  const clock = { now: () => new Date('2026-11-23T10:00:00Z') };
  return {
    objecting,
    record: new RecordAnalyticsEventUseCase(
      events,
      { objects: async (identity) => objecting.has(identity) },
      ids,
      clock,
    ),
    exportData: new ExportAnalyticsDataUseCase(events),
    eraseData: new EraseAnalyticsDataUseCase(events),
  };
}

describe('RecordAnalyticsEventUseCase', () => {
  it('should record the first visit with where it came from', async () => {
    // Arrange
    const { record, exportData } = setUp();

    // Act
    await record.execute({ identity: 'uid-ana', fact: FIRST_VISIT });

    // Assert
    expect(await exportData.execute('uid-ana')).toEqual([
      { occurredAt: '2026-11-23T10:00:00.000Z', fact: FIRST_VISIT },
    ]);
  });

  it('should record the first visit only once', async () => {
    // Arrange
    const { record, exportData } = setUp();
    await record.execute({ identity: 'uid-ana', fact: FIRST_VISIT });

    // Act
    await record.execute({
      identity: 'uid-ana',
      fact: {
        kind: 'first-visit',
        origin: { source: null, campaign: null, content: null, ref: null },
      },
    });

    // Assert
    expect(await exportData.execute('uid-ana')).toHaveLength(1);
  });

  it('should record nothing of who objects to product analytics', async () => {
    // Arrange
    const { record, exportData, objecting } = setUp();
    objecting.add('uid-ana');

    // Act
    await record.execute({ identity: 'uid-ana', fact: { kind: 'room-created', roomId: 'room-1' } });

    // Assert
    expect(await exportData.execute('uid-ana')).toBeUndefined();
  });
});

describe('EraseAnalyticsDataUseCase', () => {
  it('should erase every event of the identity', async () => {
    // Arrange
    const { record, exportData, eraseData } = setUp();
    await record.execute({ identity: 'uid-ana', fact: FIRST_VISIT });
    await record.execute({ identity: 'uid-ana', fact: { kind: 'room-joined', roomId: 'room-1' } });

    // Act
    await eraseData.execute('uid-ana');

    // Assert
    expect(await exportData.execute('uid-ana')).toBeUndefined();
  });
});
