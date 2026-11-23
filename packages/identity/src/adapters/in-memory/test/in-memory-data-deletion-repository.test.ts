import { describeDataDeletionRepositoryContract } from '../../test/data-deletion-repository.contract.ts';
import { InMemoryDataDeletionRepository } from '../in-memory-data-deletion-repository.ts';

describeDataDeletionRepositoryContract(
  'InMemoryDataDeletionRepository',
  async () => new InMemoryDataDeletionRepository(),
);
