import { InMemoryDilemmaCatalog } from '../in-memory-dilemma-catalog.ts';
import {
  CONTRACT_DILEMMAS,
  describeDilemmaCatalogContract,
} from '../../test/dilemma-catalog.contract.ts';

describeDilemmaCatalogContract('InMemoryDilemmaCatalog', async () => {
  const dilemmas = CONTRACT_DILEMMAS.map(({ text, options, ...facts }, index) => ({
    ...facts,
    dilemmaId: `TestDilemma${index + 1}`,
    text,
    options: options.map((option, optionIndex) => ({
      optionId: `TestDilemma${index + 1}Option${optionIndex + 1}`,
      text: option,
    })),
  }));
  const stored = dilemmas.map(({ dilemmaId, text, options }) => ({ dilemmaId, text, options }));
  return { catalog: new InMemoryDilemmaCatalog(dilemmas), stored };
});
