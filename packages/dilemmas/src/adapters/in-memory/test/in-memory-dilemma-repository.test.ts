import { InMemoryDilemmaRepository } from '../in-memory-dilemma-repository.ts';
import { describeDilemmaRepositoryContract } from '../../test/dilemma-repository.contract.ts';

describeDilemmaRepositoryContract(
  'InMemoryDilemmaRepository',
  async () => new InMemoryDilemmaRepository(),
);
