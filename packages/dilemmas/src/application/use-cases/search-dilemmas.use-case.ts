import type { MinimumAge } from '../../domain/vos/minimum-age.vo.ts';
import type { DilemmaStatus } from '../../domain/entities/dilemma.ts';
import { relevanceOf } from '../../domain/services/text-search.ts';
import type { DilemmaRepository } from '../ports/dilemma-repository.port.ts';

export interface SearchDilemmasInput {
  readonly dilemmaIds?: readonly string[];
  /** Any of them; none, every category. */
  readonly categories?: readonly string[];
  /** What a player typed, looked for in the text, in the language asked for, and in the tags. */
  readonly text?: string;
  /** 16 leaves out the dilemmas for adults. */
  readonly maximumMinimumAge: MinimumAge;
  readonly status: DilemmaStatus;
  /** The language of the texts returned; the original one while there is no translation. */
  readonly language: string;
}

export interface SearchDilemmasOutput {
  readonly dilemmas: readonly {
    readonly dilemmaId: string;
    readonly version: number;
    readonly text: string;
    readonly minimumAge: MinimumAge;
    readonly category: string;
    readonly tags: readonly string[];
  }[];
}

/**
 * What Dilemmas publishes to the other contexts to look for dilemmas: the public ones that match
 * every criterion given, at their current version. With a text, the ones that match it best come
 * first; the rest, and every search without one, ordered by id.
 */
export interface SearchDilemmas {
  execute(input: SearchDilemmasInput): Promise<SearchDilemmasOutput>;
}

export class SearchDilemmasUseCase implements SearchDilemmas {
  readonly #dilemmaRepository: DilemmaRepository;

  constructor(dilemmaRepository: DilemmaRepository) {
    this.#dilemmaRepository = dilemmaRepository;
  }

  async execute({
    language,
    text: query = '',
    ...criteria
  }: SearchDilemmasInput): Promise<SearchDilemmasOutput> {
    const found = await this.#dilemmaRepository.search(criteria);
    const matched = found.flatMap((dilemma) => {
      const text = dilemma.contentIn(language).text;
      const relevance = relevanceOf(query, { text, tags: dilemma.tags });
      return relevance === undefined ? [] : [{ dilemma, text, relevance }];
    });
    // A stable sort: the same relevance keeps the order by id of the repository.
    matched.sort((a, b) => a.relevance - b.relevance);
    return {
      dilemmas: matched.map(({ dilemma, text }) => ({
        dilemmaId: dilemma.id,
        version: dilemma.version,
        text,
        minimumAge: dilemma.minimumAge,
        category: dilemma.category,
        tags: dilemma.tags,
      })),
    };
  }
}
