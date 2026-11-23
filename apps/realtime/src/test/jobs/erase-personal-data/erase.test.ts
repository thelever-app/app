import { ConsoleLogger } from '@thelever-app/db';
import {
  DeletionsToEraseUseCase,
  ErasePersonalDataUseCase,
  RequestDataDeletionUseCase,
} from '@thelever-app/identity';
import { InMemoryDataDeletionRepository } from '@thelever-app/identity/in-memory';
import { describe, expect, it } from 'vitest';
import { erasePersonalData } from '../../../jobs/erase-personal-data/erase.ts';

function setUp(failingFor: string | undefined = undefined) {
  const deletions = new InMemoryDataDeletionRepository();
  let next = 0;
  const ids = { generate: () => `deletion-${++next}` };
  const clock = { now: () => new Date('2026-11-23T10:00:00Z') };
  const erased: string[] = [];
  const store = {
    section: 'test',
    export: async () => undefined,
    erase: async (identity: string) => {
      if (identity === failingFor) throw new Error('the store is down');
      erased.push(identity);
    },
  };
  return {
    erased,
    deletions,
    request: new RequestDataDeletionUseCase(deletions, ids, clock),
    erasure: {
      deletionsToErase: new DeletionsToEraseUseCase(deletions),
      erasePersonalData: new ErasePersonalDataUseCase(
        deletions,
        [store],
        { erase: async () => undefined },
        clock,
      ),
      runCommand: <T>(command: () => Promise<T>) => command(),
      logger: new ConsoleLogger(),
    },
  };
}

describe('erasePersonalData', () => {
  it('should erase every pending deletion of the log', async () => {
    // Arrange
    const { request, erasure, erased, deletions } = setUp();
    await request.execute('uid-ana');
    await request.execute('uid-luis');

    // Act
    const result = await erasePersonalData(erasure, { again: false });

    // Assert
    expect(result).toEqual({ erased: 2, failed: 0 });
    expect(erased).toEqual(['uid-ana', 'uid-luis']);
    expect(await deletions.pending()).toEqual([]);
  });

  it('should go on with the others when one fails, and fail at the end', async () => {
    // Arrange
    const { request, erasure, erased, deletions } = setUp('uid-ana');
    await request.execute('uid-ana');
    await request.execute('uid-luis');

    // Act & Assert
    await expect(erasePersonalData(erasure, { again: false })).rejects.toThrow(
      '1 deletions could not be erased',
    );
    expect(erased).toEqual(['uid-luis']);
    expect((await deletions.pending()).map(({ identity }) => identity)).toEqual(['uid-ana']);
  });

  it('should erase every deletion of the log again after a restore', async () => {
    // Arrange
    const { request, erasure, erased } = setUp();
    await request.execute('uid-ana');
    await erasePersonalData(erasure, { again: false });

    // Act
    await erasePersonalData(erasure, { again: true });

    // Assert
    expect(erased).toEqual(['uid-ana', 'uid-ana']);
  });
});
