import { Dilemma, type DilemmaRepository, type IdGenerator } from '@thelever-app/dilemmas';
import { GAP_MARKER } from '@thelever-app/dilemmas/published';
import { SEED_DILEMMAS } from '@thelever-app/dilemmas/seed';
import type { CatalogEntry } from './driver.ts';

/** A dilemma of the test data, with what a scenario checks of it. */
export interface TestDilemma extends CatalogEntry {
  readonly dilemmaId: string;
  /** The language it is written in, which a room must play in to find it. */
  readonly language: string;
  /** Its text and its options in other languages, option n translating option n. */
  readonly translations: readonly TestTranslation[];
  readonly tags: readonly string[];
  readonly options: readonly string[];
}

/** A dilemma of the test data in another language. */
export interface TestTranslation {
  readonly language: string;
  readonly text: string;
  readonly options: readonly string[];
}

/** The two options almost every dilemma of the test data has. */
export const OPTION_TEXTS = ['Pull the lever', 'Do nothing'] as const;

/** The three options of the dilemmas of the test data that have three. */
export const THREE_OPTION_TEXTS = [
  'Save the child',
  'Save the doctor',
  'Save the athlete',
] as const;

function dilemmas(
  prefix: string,
  count: number,
  {
    minimumAge = 16,
    category = 'life-and-death',
    tags = [],
    status = 'in-catalog',
    options = OPTION_TEXTS,
    language = 'es',
    translations = [],
    gap = false,
  }: Partial<Omit<TestDilemma, 'dilemmaId' | 'text'>> & { readonly gap?: boolean },
): TestDilemma[] {
  return Array.from({ length: count }, (_, index) => ({
    dilemmaId: `${prefix}-${index + 1}`,
    text: `Text of ${prefix}-${index + 1}${gap ? ` about ${GAP_MARKER}` : ''}`,
    minimumAge,
    category,
    tags,
    status,
    options,
    language,
    translations,
  }));
}

/** The options of the dilemma of the test data written in Spanish, and translated into English. */
export const SPANISH_OPTION_TEXTS = ['Tirar de la palanca', 'No hacer nada'] as const;

/**
 * Test data, enough for every scenario of the lobby and the decision phase:
 * - in life-and-death, 8 dilemmas suitable from 16 and tagged "family", so a search for it fills
 *   a game of 8; 30 for adults, so an adults-only room of every category almost surely plays
 *   some; and new dilemmas for each age;
 * - in honesty, 8 dilemmas and 2 new ones, to choose categories;
 * - in loyalty, 3 dilemmas with the gap "someone in the group" and one with three options, for the
 *   host to pick;
 * - all of them in Spanish but 6 of honesty in French, for a room that changes its language;
 * - in justice, one with its texts in Spanish and a translation into English, and one only in
 *   Spanish, for the language each player reads in.
 */
export const TEST_DILEMMAS: readonly TestDilemma[] = [
  ...dilemmas('life-and-death', 8, { tags: ['family'] }),
  ...dilemmas('life-and-death-for-adults', 30, { minimumAge: 18 }),
  ...dilemmas('new-life-and-death', 3, { status: 'in-exploration' }),
  ...dilemmas('new-life-and-death-for-adults', 1, { minimumAge: 18, status: 'in-exploration' }),
  ...dilemmas('honesty', 8, { category: 'honesty' }),
  ...dilemmas('new-honesty', 2, { category: 'honesty', status: 'in-exploration' }),
  ...dilemmas('gap', 3, { category: 'loyalty', gap: true }),
  ...dilemmas('three-options', 1, { category: 'loyalty', options: THREE_OPTION_TEXTS }),
  ...dilemmas('honesty-in-french', 6, { category: 'honesty', language: 'fr' }),
  ...dilemmas('english-version', 1, {
    category: 'justice',
    options: SPANISH_OPTION_TEXTS,
    translations: [
      { language: 'en', text: 'Text of english-version-1 in English', options: OPTION_TEXTS },
    ],
  }),
  ...dilemmas('spanish-only', 1, { category: 'justice' }),
];

/** The text of the dilemma of the test data in that language. */
export function testTextIn(dilemmaId: string, language: string): string {
  const dilemma = TEST_DILEMMAS.find((candidate) => candidate.dilemmaId === dilemmaId);
  if (!dilemma) throw new Error(`The test data has no dilemma ${dilemmaId}`);
  if (dilemma.language === language) return dilemma.text;
  const translation = dilemma.translations.find((candidate) => candidate.language === language);
  if (!translation) throw new Error(`Dilemma ${dilemmaId} of the test data is not in ${language}`);
  return translation.text;
}

/**
 * The ids of the dilemmas of the test data with the two usual options and no gap, suitable from
 * 16, enough for the largest game: those a game plays when its scenario names those options.
 */
export const TWO_OPTION_DILEMMA_IDS = TEST_DILEMMAS.filter(
  ({ text, minimumAge, status, options, language }) =>
    language === 'es' &&
    options === OPTION_TEXTS &&
    !text.includes(GAP_MARKER) &&
    minimumAge === 16 &&
    status === 'in-catalog',
).map(({ dilemmaId }) => dilemmaId);

/** The ids of the dilemmas of the test data with the gap. */
export const GAP_DILEMMA_IDS = TEST_DILEMMAS.filter(({ text }) => text.includes(GAP_MARKER)).map(
  ({ dilemmaId }) => dilemmaId,
);

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
  if (test) {
    const { text, minimumAge, category, status } = test;
    return { text, minimumAge, category, status };
  }
  const seed = SEED_DILEMMAS.find(({ id }) => id === dilemmaId);
  if (seed) {
    const { text, minimumAge, category } = seed;
    return { text, minimumAge, category, status: 'in-catalog' };
  }
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

/** Stores the test data, by the curation team, each dilemma in its language, with its status and its translations. */
export async function loadTestDilemmas(repository: DilemmaRepository): Promise<void> {
  for (const test of TEST_DILEMMAS) {
    const { dilemmaId, text, minimumAge, category, tags, status, options, language } = test;
    const ids = new FixedIds([dilemmaId, ...options.map((_, n) => `${dilemmaId}-option-${n + 1}`)]);
    const created = Dilemma.create(
      { text, language, options, category, tags, minimumAge },
      ids,
    ).toSnapshot();
    const original = Dilemma.restore({ ...created, version: { ...created.version, status } });
    await repository.save(original);
    for (const translation of test.translations) {
      const translationId = `${dilemmaId}-${translation.language}`;
      const translationIds = new FixedIds([
        translationId,
        ...translation.options.map((_, n) => `${translationId}-option-${n + 1}`),
      ]);
      await repository.save(
        Dilemma.translate(original, { ...translation, tags: [] }, translationIds),
      );
    }
  }
}
