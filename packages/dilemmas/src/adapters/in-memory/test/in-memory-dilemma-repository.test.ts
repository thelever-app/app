import { InMemoryDilemmaRepository } from '../in-memory-dilemma-repository.ts';
import { describeDilemmaQueriesContract } from '../../test/dilemma-queries.contract.ts';
import { describeDilemmaRepositoryContract } from '../../test/dilemma-repository.contract.ts';

describeDilemmaRepositoryContract(
  'InMemoryDilemmaRepository',
  async () => new InMemoryDilemmaRepository(),
);

describeDilemmaQueriesContract('InMemoryDilemmaRepository', async () => {
  const repository = new InMemoryDilemmaRepository();
  return { repository, queries: repository };
});
