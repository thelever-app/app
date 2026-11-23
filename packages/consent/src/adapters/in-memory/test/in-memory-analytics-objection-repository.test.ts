import { describeAnalyticsObjectionRepositoryContract } from '../../test/analytics-objection-repository.contract.ts';
import { InMemoryAnalyticsObjectionRepository } from '../in-memory-analytics-objection-repository.ts';

describeAnalyticsObjectionRepositoryContract(
  'InMemoryAnalyticsObjectionRepository',
  async () => new InMemoryAnalyticsObjectionRepository(),
);
