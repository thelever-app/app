import type { Category } from '../../domain/vos/category.vo.ts';
import { DilemmaNotFoundError } from '../../application/errors/dilemma-not-found.error.ts';
import { InvalidPageError } from '../../application/errors/invalid-page.error.ts';
import {
  GAP_MARKER,
  type CandidateSearch,
  type CatalogDilemma,
  type CatalogPage,
  type DilemmaCatalog,
  type DilemmaContent,
  type DilemmaSearch,
  type SearchPage,
} from '../../application/ports/dilemma-catalog.port.ts';
import type { GameDilemma } from '../../domain/entities/game.ts';

/** The only version of its dilemmas, which never change. */
const VERSION = 1;

/** The text and the options of a dilemma in another language, option n translating option n. */
export interface InMemoryTranslation {
  readonly language: string;
  readonly text: string;
  readonly options: readonly string[];
}

/**
 * A dilemma of the in-memory catalog: its content and, unless given, one in Spanish, without
 * translations, in the general catalog for everyone.
 */
export interface InMemoryDilemma extends Omit<DilemmaContent, 'language'> {
  readonly language?: string;
  readonly translations?: readonly InMemoryTranslation[];
  readonly minimumAge?: 16 | 18;
  readonly category?: Category;
  readonly tags?: readonly string[];
  readonly status?: 'in-catalog' | 'in-exploration';
  readonly compromising?: boolean;
}

/** A fixed set of dilemmas, at their first version and with their translations, for unit and acceptance tests. */
export class InMemoryDilemmaCatalog implements DilemmaCatalog {
  readonly #dilemmas: ReadonlyMap<string, Required<InMemoryDilemma>>;

  constructor(dilemmas: readonly InMemoryDilemma[]) {
    this.#dilemmas = new Map(
      dilemmas.map((dilemma) => [
        dilemma.dilemmaId,
        {
          language: 'es',
          translations: [],
          minimumAge: 16,
          category: 'life-and-death',
          tags: [],
          status: 'in-catalog',
          compromising: false,
          ...dilemma,
        },
      ]),
    );
  }

  async findOptionIds(dilemmaIds: readonly string[]): Promise<readonly GameDilemma[]> {
    return dilemmaIds.map((dilemmaId) => {
      const { text, options } = this.#dilemmaOf(dilemmaId);
      return {
        dilemmaId,
        version: VERSION,
        optionIds: options.map(({ optionId }) => optionId),
        hasGap: [text, ...options.map((option) => option.text)].some((field) =>
          field.includes(GAP_MARKER),
        ),
      };
    });
  }

  async findContents(
    dilemmas: readonly { readonly dilemmaId: string; readonly version: number }[],
    language: string,
  ): Promise<readonly DilemmaContent[]> {
    return dilemmas.map(({ dilemmaId, version }) => {
      if (version !== VERSION) throw new DilemmaNotFoundError(dilemmaId);
      const dilemma = this.#dilemmaOf(dilemmaId);
      const translation = dilemma.translations.find((candidate) => candidate.language === language);
      if (!translation) {
        const { text, options } = dilemma;
        return { dilemmaId, text, options, language: dilemma.language };
      }
      return {
        dilemmaId,
        text: translation.text,
        options: dilemma.options.map(({ optionId }, index) => ({
          optionId,
          text: translation.options[index]!,
        })),
        language,
      };
    });
  }

  async findCandidateIds(criteria: CandidateSearch): Promise<readonly string[]> {
    return this.#matching(criteria).map(({ dilemmaId }) => dilemmaId);
  }

  async search(criteria: DilemmaSearch, { size, after }: SearchPage): Promise<CatalogPage> {
    const found = this.#matching(criteria);
    // A page starts after the dilemma the page before ended with.
    const start =
      after === undefined ? 0 : found.findIndex(({ dilemmaId }) => dilemmaId === after) + 1;
    if (start === 0 && after !== undefined) throw new InvalidPageError(after);
    const page = found.slice(start, start + size);
    const last = page.at(-1);
    return {
      dilemmas: page,
      ...(last && start + size < found.length && { next: last.dilemmaId }),
    };
  }

  /** The dilemmas that match, in the order they were given. */
  #matching(criteria: DilemmaSearch): CatalogDilemma[] {
    const text = criteria.text?.trim().toLowerCase() ?? '';
    return [...this.#dilemmas.values()]
      .filter(
        (dilemma) =>
          (!criteria.dilemmaIds || criteria.dilemmaIds.includes(dilemma.dilemmaId)) &&
          (!criteria.categories || criteria.categories.includes(dilemma.category)) &&
          // Only the whole text typed, in any case: ranking what matches best is up to Dilemmas.
          [dilemma.text, ...dilemma.tags].some((field) => field.toLowerCase().includes(text)) &&
          dilemma.minimumAge <= criteria.maximumMinimumAge &&
          dilemma.language === criteria.language &&
          dilemma.status === criteria.status &&
          (criteria.includeCompromising || !dilemma.compromising),
      )
      .map(({ dilemmaId, text, minimumAge, category, tags, options, compromising }) => ({
        dilemmaId,
        text,
        minimumAge,
        category,
        tags,
        optionCount: options.length,
        compromising,
      }));
  }

  #dilemmaOf(dilemmaId: string): Required<InMemoryDilemma> {
    const dilemma = this.#dilemmas.get(dilemmaId);
    if (!dilemma) throw new DilemmaNotFoundError(dilemmaId);
    return dilemma;
  }
}
