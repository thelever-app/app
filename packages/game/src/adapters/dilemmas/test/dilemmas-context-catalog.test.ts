import { describe, expect, it } from 'vitest';
import { Dilemma, GetDilemmasUseCase } from '@thelever-app/dilemmas';
import { InMemoryDilemmaRepository, SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { DilemmasContextCatalog } from '../dilemmas-context-catalog.ts';
import {
  CONTRACT_DILEMMAS,
  describeDilemmaCatalogContract,
} from '../../test/dilemma-catalog.contract.ts';

const CLASSIFICATION = { language: 'es', category: 'honesty', tags: [], minimumAge: 16 };

async function catalogWithContractDilemmas() {
  const repository = new InMemoryDilemmaRepository();
  const idGenerator = new SequentialIdGenerator('dilemma');
  const dilemmas = CONTRACT_DILEMMAS.map(({ text, options }) =>
    Dilemma.create({ ...CLASSIFICATION, text, options }, idGenerator),
  );
  for (const dilemma of dilemmas) await repository.save(dilemma);

  const stored = dilemmas.map((dilemma) => ({
    dilemmaId: dilemma.id,
    text: dilemma.text,
    options: dilemma.options.map(({ id, text }) => ({ optionId: id, text })),
  }));
  return {
    catalog: new DilemmasContextCatalog(new GetDilemmasUseCase(repository)),
    stored,
    repository,
    first: dilemmas[0]!,
  };
}

describeDilemmaCatalogContract('DilemmasContextCatalog', catalogWithContractDilemmas);

describe('DilemmasContextCatalog', () => {
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
