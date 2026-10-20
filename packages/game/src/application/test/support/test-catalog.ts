import { InMemoryDilemmaCatalog } from '../../../adapters/in-memory/in-memory-dilemma-catalog.ts';

export const TEST_DILEMMA_IDS = ['TestDilemma1', 'TestDilemma2', 'TestDilemma3'];
export const TEST_OPTION_IDS = ['TestOption', 'TestOtherOption', 'TestSecretOption'];

/** Every test dilemma has the same three options; its text names the dilemma. */
export function testCatalog(): InMemoryDilemmaCatalog {
  return new InMemoryDilemmaCatalog(
    TEST_DILEMMA_IDS.map((dilemmaId) => ({
      dilemmaId,
      text: `TextOf${dilemmaId}`,
      options: TEST_OPTION_IDS.map((optionId) => ({ optionId, text: `TextOf${optionId}` })),
    })),
  );
}
