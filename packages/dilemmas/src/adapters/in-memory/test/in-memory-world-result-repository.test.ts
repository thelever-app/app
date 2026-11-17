import { InMemoryWorldResultRepository } from '../in-memory-world-result-repository.ts';
import { describeWorldResultRepositoryContract } from '../../test/world-result-repository.contract.ts';

describeWorldResultRepositoryContract(
  'InMemoryWorldResultRepository',
  // TestDilemmaId is at its version 2, as the contract says.
  async () => new InMemoryWorldResultRepository(async () => 2),
);
