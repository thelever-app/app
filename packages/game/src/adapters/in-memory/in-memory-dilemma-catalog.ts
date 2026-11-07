import { DilemmaNotFoundError } from '../../application/errors/dilemma-not-found.error.ts';
import type {
  CatalogDilemma,
  DilemmaCatalog,
  DilemmaContent,
  DilemmaSearch,
} from '../../application/ports/dilemma-catalog.port.ts';
import type { GameDilemma } from '../../domain/entities/game.ts';

/** The only version of its dilemmas, which never change. */
const VERSION = 1;

/** A dilemma of the in-memory catalog: its content and, unless given, one in the general catalog for everyone. */
export interface InMemoryDilemma extends DilemmaContent {
  readonly minimumAge?: 16 | 18;
  readonly category?: string;
  readonly tags?: readonly string[];
  readonly status?: 'in-catalog' | 'in-exploration';
}

/** A fixed set of dilemmas, at their first version and in a single language, for unit and acceptance tests. */
export class InMemoryDilemmaCatalog implements DilemmaCatalog {
  readonly #dilemmas: ReadonlyMap<string, Required<InMemoryDilemma>>;

  constructor(dilemmas: readonly InMemoryDilemma[]) {
    this.#dilemmas = new Map(
      dilemmas.map((dilemma) => [
        dilemma.dilemmaId,
        {
          minimumAge: 16,
          category: 'life-and-death',
          tags: [],
          status: 'in-catalog',
          ...dilemma,
        },
      ]),
    );
  }

  async findOptionIds(dilemmaIds: readonly string[]): Promise<readonly GameDilemma[]> {
    return dilemmaIds.map((dilemmaId) => ({
      dilemmaId,
      version: VERSION,
      optionIds: this.#dilemmaOf(dilemmaId).options.map(({ optionId }) => optionId),
    }));
  }

  async findContents(
    dilemmas: readonly { readonly dilemmaId: string; readonly version: number }[],
  ): Promise<readonly DilemmaContent[]> {
    return dilemmas.map(({ dilemmaId, version }) => {
      if (version !== VERSION) throw new DilemmaNotFoundError(dilemmaId);
      const { text, options } = this.#dilemmaOf(dilemmaId);
      return { dilemmaId, text, options };
    });
  }

  async search(criteria: DilemmaSearch): Promise<readonly CatalogDilemma[]> {
    return [...this.#dilemmas.values()]
      .filter(
        (dilemma) =>
          (!criteria.dilemmaIds || criteria.dilemmaIds.includes(dilemma.dilemmaId)) &&
          (!criteria.category || dilemma.category === criteria.category) &&
          (criteria.tags ?? []).every((tag) => dilemma.tags.includes(tag)) &&
          dilemma.minimumAge <= criteria.maximumMinimumAge &&
          dilemma.status === criteria.status,
      )
      .map(({ dilemmaId, text, minimumAge, category, tags }) => ({
        dilemmaId,
        text,
        minimumAge,
        category,
        tags,
      }));
  }

  #dilemmaOf(dilemmaId: string): Required<InMemoryDilemma> {
    const dilemma = this.#dilemmas.get(dilemmaId);
    if (!dilemma) throw new DilemmaNotFoundError(dilemmaId);
    return dilemma;
  }
}
