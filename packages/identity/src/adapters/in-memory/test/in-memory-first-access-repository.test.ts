import { describeFirstAccessRepositoryContract } from '../../test/first-access-repository.contract.ts';
import { InMemoryFirstAccessRepository } from '../in-memory-first-access-repository.ts';

describeFirstAccessRepositoryContract(
  'InMemoryFirstAccessRepository',
  async () => new InMemoryFirstAccessRepository(),
);
