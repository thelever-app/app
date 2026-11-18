import { InMemoryDilemmaCatalog } from '../../../adapters/in-memory/in-memory-dilemma-catalog.ts';
import type { ExplorationSlots } from '../../../domain/services/compose-game.ts';

export const TEST_DILEMMA_IDS = ['TestDilemma1', 'TestDilemma2', 'TestDilemma3'];
export const TEST_OPTION_IDS = ['TestOption', 'TestOtherOption', 'TestSecretOption'];

/** The values of the thresholds of exploration: 2 slots from 6 dilemmas and 3 from 11. */
export const EXPLORATION_SLOTS: ExplorationSlots = [
  { fromRandomRounds: 6, slots: 2 },
  { fromRandomRounds: 11, slots: 3 },
];

/** How many candidates each round draws from, as the room server does. */
export const CANDIDATES_PER_ROUND = 3;

function dilemma(dilemmaId: string) {
  return {
    dilemmaId,
    text: `TextOf${dilemmaId}`,
    options: TEST_OPTION_IDS.map((optionId) => ({ optionId, text: `TextOf${optionId}` })),
  };
}

/** Three dilemmas of the general catalog for everyone, with the same three options; the text names each one. */
export function testCatalog(): InMemoryDilemmaCatalog {
  return new InMemoryDilemmaCatalog(TEST_DILEMMA_IDS.map(dilemma));
}

/**
 * Enough to put a game together and search, in Spanish: ten dilemmas of the catalog in
 * life-and-death, two of them for adults and three tagged "family", three in exploration, two
 * in honesty, a compromising one in love-and-relationships and one with the gap in loyalty; and
 * ten in Catalan, for a room that plays in another language.
 */
export function lobbyCatalog(): InMemoryDilemmaCatalog {
  return new InMemoryDilemmaCatalog([
    ...Array.from({ length: 10 }, (_, index) => ({
      ...dilemma(`TestCatalog${index + 1}`),
      minimumAge: index < 2 ? (18 as const) : (16 as const),
      tags: index >= 2 && index < 5 ? ['family'] : [],
    })),
    ...['TestNew1', 'TestNew2', 'TestNew3'].map((dilemmaId) => ({
      ...dilemma(dilemmaId),
      status: 'in-exploration' as const,
    })),
    ...['TestHonesty1', 'TestHonesty2'].map((dilemmaId) => ({
      ...dilemma(dilemmaId),
      category: 'honesty' as const,
    })),
    {
      ...dilemma('TestCompromising1'),
      category: 'love-and-relationships' as const,
      compromising: true,
    },
    {
      ...dilemma('TestGap1'),
      text: 'TextOfTestGap1 about {gap}',
      category: 'loyalty' as const,
    },
    ...Array.from({ length: 10 }, (_, index) => ({
      ...dilemma(`TestCatalan${index + 1}`),
      language: 'ca',
    })),
  ]);
}
