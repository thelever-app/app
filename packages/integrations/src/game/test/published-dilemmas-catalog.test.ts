import { describe, expect, it } from 'vitest';
import { GetDilemmasUseCase, SearchDilemmasUseCase } from '@thelever-app/dilemmas';
import { InMemoryDilemmaRepository, SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { CONTRACT_DILEMMAS, describeDilemmaCatalogContract } from '@thelever-app/game/contracts';
import { PublishedDilemmasCatalog } from '../published-dilemmas-catalog.ts';
import { contractDilemma } from './support/contract-dilemma.ts';

const CLASSIFICATION = { category: 'honesty', tags: [], minimumAge: 16 };

async function catalogWithContractDilemmas() {
  const repository = new InMemoryDilemmaRepository();
  const idGenerator = new SequentialIdGenerator('dilemma');
  const dilemmas = CONTRACT_DILEMMAS.map((contract) => contractDilemma(contract, idGenerator));
  for (const dilemma of dilemmas) await repository.save(dilemma);

  const stored = dilemmas.map((dilemma) => ({
    dilemmaId: dilemma.id,
    text: dilemma.text,
    options: dilemma.options.map(({ id, text }) => ({ optionId: id, text })),
  }));
  return {
    catalog: new PublishedDilemmasCatalog(
      new GetDilemmasUseCase(repository),
      new SearchDilemmasUseCase(repository),
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
