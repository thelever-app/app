import { describeAnalyticsEventRepositoryContract } from '../../test/analytics-event-repository.contract.ts';
import { InMemoryAnalyticsEventRepository } from '../in-memory-analytics-event-repository.ts';

describeAnalyticsEventRepositoryContract(
  'InMemoryAnalyticsEventRepository',
  async () => new InMemoryAnalyticsEventRepository(),
);
