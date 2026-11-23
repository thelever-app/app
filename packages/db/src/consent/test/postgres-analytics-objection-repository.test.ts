import { describeAnalyticsObjectionRepositoryContract } from '@thelever-app/consent/contracts';
import type { Database } from '../../schema.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { PostgresAnalyticsObjectionRepository } from '../postgres-analytics-objection-repository.ts';

const database = useTestDatabase<Database>();

describeAnalyticsObjectionRepositoryContract('PostgresAnalyticsObjectionRepository', async () => {
  await emptyTables(database.db());
  return new PostgresAnalyticsObjectionRepository(database.db());
});
