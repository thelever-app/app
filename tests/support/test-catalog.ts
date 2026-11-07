import { Dilemma, type DilemmaRepository, type IdGenerator } from '@thelever-app/dilemmas';
import { SEED_DILEMMAS } from '@thelever-app/dilemmas/seed';
import type { CatalogEntry } from './driver.ts';

/** A dilemma of the test data, with what a scenario checks of it. */
export interface TestDilemma extends CatalogEntry {
  readonly dilemmaId: string;
  readonly text: string;
  readonly tags: readonly string[];
}

/** The two options every dilemma of the test data has. */
export const OPTION_TEXTS = ['Pull the lever', 'Do nothing'] as const;

function dilemmas(
  prefix: string,
  count: number,
  {
    minimumAge = 16,
    category = 'life-and-death',
    tags = [],
    status = 'in-catalog',
  }: Partial<Omit<TestDilemma, 'dilemmaId' | 'text'>>,
): TestDilemma[] {
  return Array.from({ length: count }, (_, index) => ({
    dilemmaId: `${prefix}-${index + 1}`,
    text: `Text of ${prefix}-${index + 1}`,
    minimumAge,
    category,
    tags,
    status,
  }));
}

/**
 * Test data, enough for every scenario of the lobby and the decision phase:
 * - in the default category, 8 dilemmas suitable from 16 and tagged "family", so a room for
 *   everyone fills a game of 8 with them alone; 12 for adults, so an adults-only room almost
 *   surely plays some; and new dilemmas for each age;
 * - in honesty, 8 dilemmas and 2 new ones, to change the category.
 */
export const TEST_DILEMMAS: readonly TestDilemma[] = [
  ...dilemmas('life-and-death', 8, { tags: ['family'] }),
  ...dilemmas('life-and-death-for-adults', 12, { minimumAge: 18 }),
  ...dilemmas('new-life-and-death', 3, { status: 'in-exploration' }),
  ...dilemmas('new-life-and-death-for-adults', 1, { minimumAge: 18, status: 'in-exploration' }),
  ...dilemmas('honesty', 8, { category: 'honesty' }),
  ...dilemmas('new-honesty', 2, { category: 'honesty', status: 'in-exploration' }),
];

/**
 * Test data: how many dilemmas in exploration the room server keeps room for, by the size of the
 * game. The same values it is composed with.
 */
export const EXPLORATION_SLOTS = [
  { fromDilemmaCount: 6, slots: 2 },
  { fromDilemmaCount: 11, slots: 3 },
] as const;

export function explorationSlotsFor(dilemmaCount: number): number {
  const rows = EXPLORATION_SLOTS.filter(({ fromDilemmaCount }) => fromDilemmaCount <= dilemmaCount);
  return rows.at(-1)?.slots ?? 0;
}

/**
 * What a dilemma of the test data, or of the seed every environment starts with, is: the e2e
 * database has both, since it is set up as the migrate job leaves one.
 */
export function catalogEntryOf(dilemmaId: string): CatalogEntry {
  const test = TEST_DILEMMAS.find((dilemma) => dilemma.dilemmaId === dilemmaId);
  if (test) return { minimumAge: test.minimumAge, category: test.category, status: test.status };
  const seed = SEED_DILEMMAS.find(({ id }) => id === dilemmaId);
  if (seed) return { minimumAge: seed.minimumAge, category: seed.category, status: 'in-catalog' };
  throw new Error(`The test data has no dilemma ${dilemmaId}`);
}

/** Hands out the ids it is given, in order: the dilemma keeps the id of the test data. */
class FixedIds implements IdGenerator {
  readonly #ids: string[];

  constructor(ids: readonly string[]) {
    this.#ids = [...ids];
  }

  generate(): string {
    const id = this.#ids.shift();
    if (id === undefined) throw new Error('The test data ran out of ids');
    return id;
  }
}

/** Stores the test data, in Spanish and by the curation team, each dilemma with its status. */
export async function loadTestDilemmas(repository: DilemmaRepository): Promise<void> {
  for (const { dilemmaId, text, minimumAge, category, tags, status } of TEST_DILEMMAS) {
    const ids = new FixedIds([
      dilemmaId,
      ...OPTION_TEXTS.map((_, n) => `${dilemmaId}-option-${n + 1}`),
    ]);
    const created = Dilemma.create(
      { text, language: 'es', options: OPTION_TEXTS, category, tags, minimumAge },
      ids,
    ).toSnapshot();
    await repository.save(Dilemma.restore({ ...created, version: { ...created.version, status } }));
  }
}
