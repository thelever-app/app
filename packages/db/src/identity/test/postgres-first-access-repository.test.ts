import { describeFirstAccessRepositoryContract } from '@thelever-app/identity/contracts';
import type { Database } from '../../schema.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { PostgresFirstAccessRepository } from '../postgres-first-access-repository.ts';

const database = useTestDatabase<Database>();

describeFirstAccessRepositoryContract('PostgresFirstAccessRepository', async () => {
  await emptyTables(database.db());
  return new PostgresFirstAccessRepository(database.db());
});
