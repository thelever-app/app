import type { DilemmaStatus } from '../../domain/entities/dilemma.ts';
import { isCategory } from '../../domain/vos/category.vo.ts';
import { LanguageVO } from '../../domain/vos/language.vo.ts';
import type { MinimumAge } from '../../domain/vos/minimum-age.vo.ts';
import type { DilemmaQueries } from '../ports/dilemma-queries.port.ts';

export interface FindDilemmaIdsInput {
  /** Any of them; an empty list finds nothing, and without it every category is searched. */
  readonly categories?: readonly string[];
  /** 16 leaves out the dilemmas for adults. */
  readonly maximumMinimumAge: MinimumAge;
  readonly status: DilemmaStatus;
  /** Only the dilemmas written or translated in it. */
  readonly language: string;
}

export interface FindDilemmaIdsOutput {
  readonly dilemmaIds: readonly string[];
}

/**
 * What Dilemmas publishes to the other contexts to put a game together: the ids of every public
 * dilemma that matches, and nothing else of them. A category that does not exist has no dilemmas.
 */
export interface FindDilemmaIds {
  execute(input: FindDilemmaIdsInput): Promise<FindDilemmaIdsOutput>;
}

export class FindDilemmaIdsUseCase implements FindDilemmaIds {
  readonly #dilemmaQueries: DilemmaQueries;

  constructor(dilemmaQueries: DilemmaQueries) {
    this.#dilemmaQueries = dilemmaQueries;
  }

  async execute({ categories, ...criteria }: FindDilemmaIdsInput): Promise<FindDilemmaIdsOutput> {
    new LanguageVO(criteria.language);
    const dilemmaIds = await this.#dilemmaQueries.idsOf({
      ...criteria,
      ...(categories && { categories: categories.filter(isCategory) }),
    });
    return { dilemmaIds };
  }
}
