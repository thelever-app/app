import { describeDataDeletionRepositoryContract } from '@thelever-app/identity/contracts';
import type { Database } from '../../schema.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { PostgresDataDeletionRepository } from '../postgres-data-deletion-repository.ts';

const database = useTestDatabase<Database>();

describeDataDeletionRepositoryContract('PostgresDataDeletionRepository', async () => {
  await emptyTables(database.db());
  return new PostgresDataDeletionRepository(database.db());
});
