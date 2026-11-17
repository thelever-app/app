import { describe, expect, it } from 'vitest';
import {
  FindDilemmaIdsUseCase,
  GetDilemmasUseCase,
  SearchDilemmasUseCase,
} from '@thelever-app/dilemmas';
import { InMemoryDilemmaRepository, SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { CONTRACT_DILEMMAS, describeDilemmaCatalogContract } from '@thelever-app/game/contracts';
import { PublishedDilemmasCatalog } from '../published-dilemmas-catalog.ts';
import { saveContractDilemmas } from './support/contract-dilemma.ts';

const CLASSIFICATION = {
  category: 'honesty',
  tags: [],
  minimumAge: 16,
  type: 'standard',
  compromising: false,
  scale: 'everyday',
  fixedOrder: false,
};

async function catalogWithContractDilemmas() {
  const repository = new InMemoryDilemmaRepository();
  const { dilemmas, stored } = await saveContractDilemmas(
    CONTRACT_DILEMMAS,
    repository,
    new SequentialIdGenerator('dilemma'),
  );
  return {
    catalog: new PublishedDilemmasCatalog(
      new GetDilemmasUseCase(repository),
      new SearchDilemmasUseCase(repository),
      new FindDilemmaIdsUseCase(repository),
    ),
    stored,
    repository,
    first: dilemmas[0]!,
  };
}

describeDilemmaCatalogContract('PublishedDilemmasCatalog', catalogWithContractDilemmas);

describe('PublishedDilemmasCatalog', () => {
  describe('findContents', () => {
    it('should return the version played, not the one the dilemma has now', async () => {
      // Arrange
      const { catalog, repository, first } = await catalogWithContractDilemmas();
      first.revise(
        { ...CLASSIFICATION, text: 'TestRevisedText', options: first.options },
        new SequentialIdGenerator('option'),
      );
      await repository.save(first);

      // Act
      const [content] = await catalog.findContents([{ dilemmaId: first.id, version: 1 }], 'es');

      // Assert
      expect(content?.text).toBe(CONTRACT_DILEMMAS[0].text);
      expect((await catalog.findOptionIds([first.id]))[0]?.version).toBe(2);
    });
  });
});
