import { InMemoryWorldResultRepository } from '../in-memory-world-result-repository.ts';
import { describeWorldResultRepositoryContract } from '../../test/world-result-repository.contract.ts';

describeWorldResultRepositoryContract(
  'InMemoryWorldResultRepository',
  async () => new InMemoryWorldResultRepository(),
);
