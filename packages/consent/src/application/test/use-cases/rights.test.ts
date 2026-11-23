import { describe, expect, it } from 'vitest';
import { InMemoryAcceptanceRepository } from '../../../adapters/in-memory/in-memory-acceptance-repository.ts';
import { InMemoryAnalyticsObjectionRepository } from '../../../adapters/in-memory/in-memory-analytics-objection-repository.ts';
import type { PublishedVersions } from '../../../domain/vos/legal-document.vo.ts';
import { AcceptDocumentUseCase } from '../../use-cases/accept-document.use-case.ts';
import {
  EraseConsentDataUseCase,
  ExportConsentDataUseCase,
} from '../../use-cases/consent-personal-data.use-case.ts';
import { LiftAnalyticsObjectionUseCase } from '../../use-cases/lift-analytics-objection.use-case.ts';
import { ObjectToAnalyticsUseCase } from '../../use-cases/object-to-analytics.use-case.ts';
import { ObjectsToAnalyticsUseCase } from '../../use-cases/objects-to-analytics.use-case.ts';
import { WithdrawGameConsentUseCase } from '../../use-cases/withdraw-game-consent.use-case.ts';

const GIVEN = new Date('2026-11-19T10:00:00Z');
const PUBLISHED: PublishedVersions = [
  { document: 'terms-of-use', version: 1, asksAgain: true },
  { document: 'game-consent', version: 2, asksAgain: true },
];

class FixedClock {
  current = GIVEN;
  now(): Date {
    return this.current;
  }
}

/** Keeps the identities whose game data, analytics events or withdrawal it was told of. */
class Recorded {
  readonly gameDataErased: string[] = [];
  readonly withdrawalsLogged: string[] = [];
  readonly eventsErased: string[] = [];
}

async function setUp() {
  const acceptances = new InMemoryAcceptanceRepository();
  const objections = new InMemoryAnalyticsObjectionRepository();
  const clock = new FixedClock();
  const recorded = new Recorded();
  const accept = new AcceptDocumentUseCase(acceptances, PUBLISHED, clock);
  await accept.execute({ identity: 'uid-ana', document: 'terms-of-use', version: 1 });
  await accept.execute({ identity: 'uid-ana', document: 'game-consent', version: 2 });
  clock.current = new Date('2026-11-23T10:00:00Z');
  return {
    clock,
    recorded,
    accept,
    withdraw: new WithdrawGameConsentUseCase(
      acceptances,
      PUBLISHED,
      clock,
      { erase: async (identity) => void recorded.gameDataErased.push(identity) },
      { gameConsentWithdrawn: async (identity) => void recorded.withdrawalsLogged.push(identity) },
    ),
    object: new ObjectToAnalyticsUseCase(objections, clock, {
      erase: async (identity) => void recorded.eventsErased.push(identity),
    }),
    lift: new LiftAnalyticsObjectionUseCase(objections),
    objects: new ObjectsToAnalyticsUseCase(objections),
    exportData: new ExportConsentDataUseCase(acceptances, objections),
    eraseData: new EraseConsentDataUseCase(objections),
  };
}

describe('WithdrawGameConsentUseCase', () => {
  it('should leave the game consent to give again before playing', async () => {
    // Arrange
    const { withdraw } = await setUp();

    // Act
    const view = await withdraw.execute('uid-ana');

    // Assert
    expect(view.pending).toEqual(['game-consent']);
    expect(view.changed).toEqual([]);
    expect(view.gameConsentVersion).toBeUndefined();
  });

  it('should delete the game data at once and keep it in the deletion log', async () => {
    // Arrange
    const { withdraw, recorded } = await setUp();

    // Act
    await withdraw.execute('uid-ana');

    // Assert
    expect(recorded.gameDataErased).toEqual(['uid-ana']);
    expect(recorded.withdrawalsLogged).toEqual(['uid-ana']);
  });

  it('should let the game consent be given again', async () => {
    // Arrange
    const { withdraw, accept } = await setUp();
    await withdraw.execute('uid-ana');

    // Act
    const view = await accept.execute({
      identity: 'uid-ana',
      document: 'game-consent',
      version: 2,
    });

    // Assert
    expect(view.pending).toEqual([]);
  });
});

describe('ObjectToAnalyticsUseCase', () => {
  it('should keep the objection and delete the analytics events recorded before', async () => {
    // Arrange
    const { object, objects, recorded } = await setUp();

    // Act
    await object.execute('uid-ana');

    // Assert
    expect(await objects.execute('uid-ana')).toBe(true);
    expect(await objects.execute('uid-luis')).toBe(false);
    expect(recorded.eventsErased).toEqual(['uid-ana']);
  });

  it('should count again who lifts the objection', async () => {
    // Arrange
    const { object, lift, objects } = await setUp();
    await object.execute('uid-ana');

    // Act
    await lift.execute('uid-ana');

    // Assert
    expect(await objects.execute('uid-ana')).toBe(false);
  });
});

describe('ExportConsentDataUseCase and EraseConsentDataUseCase', () => {
  it('should give the documents with their versions and dates, and the objection', async () => {
    // Arrange
    const { withdraw, object, exportData } = await setUp();
    await withdraw.execute('uid-ana');
    await object.execute('uid-ana');

    // Act
    const data = await exportData.execute('uid-ana');

    // Assert
    expect(data).toEqual({
      documents: [
        {
          document: 'terms-of-use',
          version: 1,
          acceptedAt: '2026-11-19T10:00:00.000Z',
          withdrawnAt: null,
        },
        {
          document: 'game-consent',
          version: 2,
          acceptedAt: '2026-11-19T10:00:00.000Z',
          withdrawnAt: '2026-11-23T10:00:00.000Z',
        },
      ],
      analyticsObjectedAt: '2026-11-23T10:00:00.000Z',
    });
  });

  it('should keep the minimal record of the consent when the data are deleted', async () => {
    // Arrange
    const { object, exportData, eraseData } = await setUp();
    await object.execute('uid-ana');

    // Act
    await eraseData.execute('uid-ana');

    // Assert
    const data = await exportData.execute('uid-ana');
    expect(data?.documents).toHaveLength(2);
    expect(data?.analyticsObjectedAt).toBeNull();
  });

  it('should have nothing of who never accepted anything', async () => {
    // Arrange
    const { exportData } = await setUp();

    // Act & Assert
    expect(await exportData.execute('uid-luis')).toBeUndefined();
  });
});
