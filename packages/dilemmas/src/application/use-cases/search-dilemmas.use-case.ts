import type { MinimumAge } from '../../domain/vos/minimum-age.vo.ts';
import type { DilemmaStatus } from '../../domain/entities/dilemma.ts';
import type { Category } from '../../domain/vos/category.vo.ts';
import { LanguageVO } from '../../domain/vos/language.vo.ts';
import type { DilemmaQueries } from '../ports/dilemma-queries.port.ts';

export interface SearchDilemmasInput {
  readonly dilemmaIds?: readonly string[];
  /** Any of them; an empty list finds nothing, and without it every category is searched. */
  readonly categories?: readonly Category[];
  /** What a player typed, looked for in the text and the tags as DilemmaCriteria says. */
  readonly text?: string;
  /** 16 leaves out the dilemmas for adults. */
  readonly maximumMinimumAge: MinimumAge;
  readonly status: DilemmaStatus;
  /** Only the dilemmas written or translated in it. */
  readonly language: string;
  /** How many dilemmas the page has at most. */
  readonly size: number;
  /** The `next` of the page before; none for the first page. */
  readonly after?: string;
}

export interface SearchDilemmasOutput {
  readonly dilemmas: readonly {
    readonly dilemmaId: string;
    readonly version: number;
    readonly text: string;
    readonly minimumAge: MinimumAge;
    readonly category: Category;
    readonly tags: readonly string[];
    readonly optionCount: number;
  }[];
  /** Where the next page starts; none when this one is the last. */
  readonly next?: string;
}

/**
 * What Dilemmas publishes to the other contexts to look for dilemmas: a page of the public ones
 * that match every criterion given, at their current version, in the order the catalog gives them.
 * A `next` that does not come from that search
 * throws InvalidPageError.
 */
export interface SearchDilemmas {
  execute(input: SearchDilemmasInput): Promise<SearchDilemmasOutput>;
}

export class SearchDilemmasUseCase implements SearchDilemmas {
  readonly #dilemmaQueries: DilemmaQueries;

  constructor(dilemmaQueries: DilemmaQueries) {
    this.#dilemmaQueries = dilemmaQueries;
  }

  async execute({ size, after, ...criteria }: SearchDilemmasInput): Promise<SearchDilemmasOutput> {
    new LanguageVO(criteria.language);
    const { summaries, next } = await this.#dilemmaQueries.search(criteria, {
      size,
      ...(after !== undefined && { after }),
    });
    return {
      dilemmas: summaries.map(({ id, ...summary }) => ({ dilemmaId: id, ...summary })),
      ...(next !== undefined && { next }),
    };
  }
}
