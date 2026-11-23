import { describeAnalyticsEventRepositoryContract } from '@thelever-app/analytics/contracts';
import type { Database } from '../../schema.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { PostgresAnalyticsEventRepository } from '../postgres-analytics-event-repository.ts';

const database = useTestDatabase<Database>();

describeAnalyticsEventRepositoryContract('PostgresAnalyticsEventRepository', async () => {
  await emptyTables(database.db());
  return new PostgresAnalyticsEventRepository(database.db());
});
