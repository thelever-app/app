import { describeAcceptanceRepositoryContract } from '@thelever-app/consent/contracts';
import type { Database } from '../../schema.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { PostgresAcceptanceRepository } from '../postgres-acceptance-repository.ts';

const database = useTestDatabase<Database>();

describeAcceptanceRepositoryContract('PostgresAcceptanceRepository', async () => {
  await emptyTables(database.db());
  return new PostgresAcceptanceRepository(database.db());
});
