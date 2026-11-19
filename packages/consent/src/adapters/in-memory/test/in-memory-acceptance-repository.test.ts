import { describeAcceptanceRepositoryContract } from '../../test/acceptance-repository.contract.ts';
import { InMemoryAcceptanceRepository } from '../in-memory-acceptance-repository.ts';

describeAcceptanceRepositoryContract(
  'InMemoryAcceptanceRepository',
  async () => new InMemoryAcceptanceRepository(),
);
