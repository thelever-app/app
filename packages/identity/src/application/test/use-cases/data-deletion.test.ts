import { describe, expect, it } from 'vitest';
import { InMemoryDataDeletionRepository } from '../../../adapters/in-memory/in-memory-data-deletion-repository.ts';
import { InMemoryFirstAccessRepository } from '../../../adapters/in-memory/in-memory-first-access-repository.ts';
import { FixedRandomness } from '../../../domain/test/support/fixed-randomness.ts';
import { FirstAccessPersonalData } from '../../personal-data/first-access-personal-data.ts';
import type {
  GameDataOfIdentity,
  PersonalDataStore,
} from '../../ports/personal-data-store.port.ts';
import { CarryOutDataRequestUseCase } from '../../use-cases/carry-out-data-request.use-case.ts';
import { DeletionsToEraseUseCase } from '../../use-cases/deletions-to-erase.use-case.ts';
import { ErasePersonalDataUseCase } from '../../use-cases/erase-personal-data.use-case.ts';
import { ExportPersonalDataUseCase } from '../../use-cases/export-personal-data.use-case.ts';
import { LogGameConsentWithdrawalUseCase } from '../../use-cases/log-game-consent-withdrawal.use-case.ts';
import { OpenAppUseCase } from '../../use-cases/open-app.use-case.ts';
import { RequestDataDeletionUseCase } from '../../use-cases/request-data-deletion.use-case.ts';

class FixedClock {
  current = new Date('2026-11-23T10:00:00Z');
  now(): Date {
    return this.current;
  }
}

class SequentialIds {
  #next = 0;
  generate(): string {
    this.#next += 1;
    return `deletion-${this.#next}`;
  }
}

/** A store that keeps a value per identity, and can be told to fail. */
class FakeStore implements PersonalDataStore {
  readonly section: string;
  readonly kept = new Map<string, unknown>();
  failing = false;

  constructor(section: string) {
    this.section = section;
  }

  async export(identity: string): Promise<unknown> {
    return this.kept.get(identity);
  }

  async erase(identity: string): Promise<void> {
    if (this.failing) throw new Error(`${this.section} is down`);
    this.kept.delete(identity);
  }
}

class FakeGameData implements GameDataOfIdentity {
  readonly erased: string[] = [];

  async erase(identity: string): Promise<void> {
    this.erased.push(identity);
  }
}

function setUp() {
  const deletions = new InMemoryDataDeletionRepository();
  const firstAccesses = new InMemoryFirstAccessRepository();
  const clock = new FixedClock();
  const ids = new SequentialIds();
  const likes = new FakeStore('likes');
  const reports = new FakeStore('reports');
  const gameData = new FakeGameData();
  const stores = [new FirstAccessPersonalData(firstAccesses), likes, reports];
  return {
    deletions,
    firstAccesses,
    clock,
    likes,
    reports,
    gameData,
    openApp: new OpenAppUseCase(firstAccesses, clock, new FixedRandomness()),
    requestDeletion: new RequestDataDeletionUseCase(deletions, ids, clock),
    logWithdrawal: new LogGameConsentWithdrawalUseCase(deletions, ids, clock),
    toErase: new DeletionsToEraseUseCase(deletions),
    erase: new ErasePersonalDataUseCase(deletions, stores, gameData, clock),
    exportData: new ExportPersonalDataUseCase(stores),
  };
}

describe('RequestDataDeletionUseCase', () => {
  it('should put the deletion in the log, pending', async () => {
    // Arrange
    const { requestDeletion, deletions } = setUp();

    // Act
    await requestDeletion.execute('uid-ana');

    // Assert
    expect((await deletions.pending()).map((deletion) => deletion.toSnapshot())).toEqual([
      {
        id: 'deletion-1',
        identity: 'uid-ana',
        reason: 'request',
        requestedAt: new Date('2026-11-23T10:00:00Z'),
        erasedAt: null,
      },
    ]);
  });

  it('should add nothing when the identity asks again while it waits', async () => {
    // Arrange
    const { requestDeletion, deletions } = setUp();
    await requestDeletion.execute('uid-ana');

    // Act
    await requestDeletion.execute('uid-ana');

    // Assert
    expect(await deletions.all()).toHaveLength(1);
  });
});

describe('ErasePersonalDataUseCase', () => {
  it('should delete the identity from every personal data store and mark it erased', async () => {
    // Arrange
    const { openApp, requestDeletion, toErase, erase, exportData, likes, reports, clock } = setUp();
    await openApp.execute({ identity: 'uid-ana', country: 'ES' });
    likes.kept.set('uid-ana', ['dilemma-1']);
    reports.kept.set('uid-ana', ['report-1']);
    await requestDeletion.execute('uid-ana');
    clock.current = new Date('2026-11-24T03:00:00Z');

    // Act
    for (const id of await toErase.execute({ again: false })) await erase.execute(id);

    // Assert
    expect(await exportData.execute('uid-ana')).toEqual({});
    expect(await toErase.execute({ again: false })).toEqual([]);
  });

  it('should keep the deletion pending when a store fails, so the next run does it again', async () => {
    // Arrange
    const { requestDeletion, toErase, erase, reports } = setUp();
    await requestDeletion.execute('uid-ana');
    reports.failing = true;
    const [id] = await toErase.execute({ again: false });
    if (!id) throw new Error('the deletion is not in the log');

    // Act & Assert
    await expect(erase.execute(id)).rejects.toThrow('reports is down');
    expect(await toErase.execute({ again: false })).toEqual([id]);
  });

  it('should delete only the game data of who withdrew the game consent', async () => {
    // Arrange
    const { logWithdrawal, toErase, erase, gameData, likes } = setUp();
    likes.kept.set('uid-ana', ['dilemma-1']);
    await logWithdrawal.execute('uid-ana');

    // Act: the log is done again after a restore.
    for (const id of await toErase.execute({ again: true })) await erase.execute(id);

    // Assert
    expect(gameData.erased).toEqual(['uid-ana']);
    expect(likes.kept.get('uid-ana')).toEqual(['dilemma-1']);
  });

  it('should go through every deletion of the log again after a restore', async () => {
    // Arrange
    const { requestDeletion, logWithdrawal, toErase, erase } = setUp();
    await requestDeletion.execute('uid-ana');
    await logWithdrawal.execute('uid-luis');
    for (const id of await toErase.execute({ again: false })) await erase.execute(id);

    // Act
    const again = await toErase.execute({ again: true });

    // Assert
    expect(again).toEqual(['deletion-1', 'deletion-2']);
  });
});

describe('LogGameConsentWithdrawalUseCase', () => {
  it('should keep the withdrawal in the log as already erased', async () => {
    // Arrange
    const { logWithdrawal, deletions } = setUp();

    // Act
    await logWithdrawal.execute('uid-ana');

    // Assert
    expect(await deletions.pending()).toEqual([]);
    expect((await deletions.all()).map((deletion) => deletion.toSnapshot())).toEqual([
      {
        id: 'deletion-1',
        identity: 'uid-ana',
        reason: 'game-consent-withdrawn',
        requestedAt: new Date('2026-11-23T10:00:00Z'),
        erasedAt: new Date('2026-11-23T10:00:00Z'),
      },
    ]);
  });
});

describe('ExportPersonalDataUseCase', () => {
  it('should give a section for each store that keeps something of the identity', async () => {
    // Arrange
    const { openApp, exportData, likes } = setUp();
    await openApp.execute({ identity: 'uid-ana', country: 'ES' });
    likes.kept.set('uid-ana', ['dilemma-1']);

    // Act
    const exported = await exportData.execute('uid-ana');

    // Assert
    expect(exported).toEqual({
      firstAccess: {
        region: 'eea',
        birthYear: null,
        birthMonth: null,
        lastOpenedAt: '2026-11-23T10:00:00.000Z',
        requestCode: '0000-0000-0000',
      },
      likes: ['dilemma-1'],
    });
  });
});

describe('CarryOutDataRequestUseCase', () => {
  async function arranged() {
    const ports = setUp();
    await ports.openApp.execute({ identity: 'uid-ana', country: 'ES' });
    const carryOut = new CarryOutDataRequestUseCase({
      firstAccesses: ports.firstAccesses,
      identitiesOfEmail: {
        identitiesOf: async (email) => (email === 'luis@example.com' ? ['uid-luis'] : []),
      },
      requestDeletion: ports.requestDeletion,
      exportData: ports.exportData,
    });
    return { ...ports, carryOut };
  }

  it.each(['', 'not a code', '0000-0000-0001'])(
    "should carry out nothing with %j, which is nobody's code, and say how to send it",
    async (code) => {
      // Arrange
      const { carryOut, deletions } = await arranged();

      // Act
      const outcome = await carryOut.execute({ proof: { code }, request: 'erase' });

      // Assert
      expect(outcome.carriedOut).toBe(false);
      expect(outcome.carriedOut === false && outcome.reply).toContain(
        'Ajustes › Privacidad y datos › Tus datos',
      );
      expect(await deletions.all()).toEqual([]);
    },
  );

  it('should delete the data of whose the code is, however it is written', async () => {
    // Arrange
    const { carryOut, deletions } = await arranged();

    // Act
    const outcome = await carryOut.execute({ proof: { code: '0000 0000 0000' }, request: 'erase' });

    // Assert
    expect(outcome).toMatchObject({ carriedOut: true, identities: ['uid-ana'] });
    expect((await deletions.pending()).map(({ identity }) => identity)).toEqual(['uid-ana']);
  });

  it('should give a copy of the data of whose the code is', async () => {
    // Arrange
    const { carryOut } = await arranged();

    // Act
    const outcome = await carryOut.execute({
      proof: { code: '0000-0000-0000' },
      request: 'export',
    });

    // Assert
    expect(outcome.carriedOut && Object.keys(outcome.exported)).toEqual(['uid-ana']);
  });

  it('should carry out the request of whoever writes from the email of their notice', async () => {
    // Arrange
    const { carryOut, deletions } = await arranged();

    // Act
    const outcome = await carryOut.execute({
      proof: { email: 'luis@example.com' },
      request: 'erase',
    });

    // Assert
    expect(outcome).toMatchObject({ carriedOut: true, identities: ['uid-luis'] });
    expect((await deletions.pending()).map(({ identity }) => identity)).toEqual(['uid-luis']);
  });

  it('should carry out nothing from an email that left no notice', async () => {
    // Arrange
    const { carryOut } = await arranged();

    // Act & Assert
    expect(
      (await carryOut.execute({ proof: { email: 'eva@example.com' }, request: 'export' }))
        .carriedOut,
    ).toBe(false);
  });
});
