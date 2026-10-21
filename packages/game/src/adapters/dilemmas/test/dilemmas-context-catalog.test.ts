import { Dilemma, GetDilemmasUseCase } from '@thelever-app/dilemmas';
import { InMemoryDilemmaRepository, SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { DilemmasContextCatalog } from '../dilemmas-context-catalog.ts';
import {
  CONTRACT_DILEMMAS,
  describeDilemmaCatalogContract,
} from '../../test/dilemma-catalog.contract.ts';

describeDilemmaCatalogContract('DilemmasContextCatalog', async () => {
  const repository = new InMemoryDilemmaRepository();
  const idGenerator = new SequentialIdGenerator('dilemma');
  const dilemmas = CONTRACT_DILEMMAS.map(({ text, options }) =>
    Dilemma.create({ text, language: 'es', options }, idGenerator),
  );
  for (const dilemma of dilemmas) await repository.save(dilemma);

  const stored = dilemmas.map((dilemma) => ({
    dilemmaId: dilemma.id,
    text: dilemma.text,
    options: dilemma.options.map(({ id, text }) => ({ optionId: id, text })),
  }));
  return { catalog: new DilemmasContextCatalog(new GetDilemmasUseCase(repository)), stored };
});
