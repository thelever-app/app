import type { MinimumAge } from '../../domain/vos/minimum-age.vo.ts';
import type { DilemmaStatus } from '../../domain/entities/dilemma.ts';
import type { DilemmaRepository } from '../ports/dilemma-repository.port.ts';

export interface SearchDilemmasInput {
  readonly dilemmaIds?: readonly string[];
  /** Any of them; an empty list finds nothing, and without it every category is searched. */
  readonly categories?: readonly string[];
  /** What a player typed, looked for in the text and the tags as DilemmaCriteria says. */
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
    readonly optionCount: number;
  }[];
}

/**
 * What Dilemmas publishes to the other contexts to look for dilemmas: the public ones that match
 * every criterion given, at their current version, in the order the catalog gives them.
 */
export interface SearchDilemmas {
  execute(input: SearchDilemmasInput): Promise<SearchDilemmasOutput>;
}

export class SearchDilemmasUseCase implements SearchDilemmas {
  readonly #dilemmaRepository: DilemmaRepository;

  constructor(dilemmaRepository: DilemmaRepository) {
    this.#dilemmaRepository = dilemmaRepository;
  }

  async execute({ language, ...criteria }: SearchDilemmasInput): Promise<SearchDilemmasOutput> {
    const found = await this.#dilemmaRepository.search(criteria);
    return {
      dilemmas: found.map((dilemma) => ({
        dilemmaId: dilemma.id,
        version: dilemma.version,
        text: dilemma.contentIn(language).text,
        minimumAge: dilemma.minimumAge,
        category: dilemma.category,
        tags: dilemma.tags,
        optionCount: dilemma.options.length,
      })),
    };
  }
}
