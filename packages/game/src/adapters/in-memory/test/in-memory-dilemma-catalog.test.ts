import { InMemoryDilemmaCatalog } from '../in-memory-dilemma-catalog.ts';
import {
  CONTRACT_DILEMMAS,
  describeDilemmaCatalogContract,
} from '../../test/dilemma-catalog.contract.ts';

describeDilemmaCatalogContract('InMemoryDilemmaCatalog', async () => {
  const stored = CONTRACT_DILEMMAS.map(({ text, options }, index) => ({
    dilemmaId: `TestDilemma${index + 1}`,
    text,
    options: options.map((option, optionIndex) => ({
      optionId: `TestDilemma${index + 1}Option${optionIndex + 1}`,
      text: option,
    })),
  }));
  return { catalog: new InMemoryDilemmaCatalog(stored), stored };
});
