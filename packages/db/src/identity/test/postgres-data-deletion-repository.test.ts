import { DataDeletion } from '@thelever-app/identity';
import { describeDataDeletionRepositoryContract } from '@thelever-app/identity/contracts';
import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import type { Database } from '../../schema.ts';
import { inTransaction } from '../../transaction.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { PostgresDataDeletionRepository } from '../postgres-data-deletion-repository.ts';

const database = useTestDatabase<Database>();

describeDataDeletionRepositoryContract('PostgresDataDeletionRepository', async () => {
  await emptyTables(database.db());
  return new PostgresDataDeletionRepository(database.db());
});

describe('PostgresDataDeletionRepository inside a command', () => {
  it('should read through the transaction of the command, with a single connection as the jobs have', async () => {
    await emptyTables(database.db());
    const single = await openDatabase<Database>(
      { kind: 'url', url: database.url() },
      { maxConnections: 1, logger: new ConsoleLogger() },
    );
    try {
      const repository = new PostgresDataDeletionRepository(single.db);
      const deletion = DataDeletion.request({
        id: 'deletion-1',
        identity: 'identity-1',
        reason: 'request',
        now: new Date('2026-11-23T10:00:00Z'),
      });

      const read = await inTransaction(single.db, async () => {
        await repository.save(deletion);
        return {
          found: await repository.findById('deletion-1'),
          pending: await repository.pending(),
          all: await repository.all(),
          ofIdentity: await repository.ofIdentity('identity-1'),
        };
      });

      expect(read.found?.id).toBe('deletion-1');
      expect(read.pending.map(({ id }) => id)).toEqual(['deletion-1']);
      expect(read.all.map(({ id }) => id)).toEqual(['deletion-1']);
      expect(read.ofIdentity.map(({ id }) => id)).toEqual(['deletion-1']);
    } finally {
      await single.close();
    }
  });
});
