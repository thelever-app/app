import type { DilemmaStatus } from '../../domain/entities/dilemma.ts';
import type { Category } from '../../domain/vos/category.vo.ts';
import type { DilemmaType } from '../../domain/vos/dilemma-type.vo.ts';
import { LanguageVO } from '../../domain/vos/language.vo.ts';
import type { MinimumAge } from '../../domain/vos/minimum-age.vo.ts';
import type { Scale } from '../../domain/vos/scale.vo.ts';
import type { DilemmaQueries } from '../ports/dilemma-queries.port.ts';

export interface FindCandidatesInput {
  /** Any of them; an empty list finds nothing, and without it every category is searched. */
  readonly categories?: readonly Category[];
  /** 16 leaves out the dilemmas for adults. */
  readonly maximumMinimumAge: MinimumAge;
  readonly status: DilemmaStatus;
  /** Only the dilemmas written or translated in it. */
  readonly language: string;
  /** Whether the compromising dilemmas are found too. */
  readonly includeCompromising: boolean;
  /** At most how many are drawn. */
  readonly count: number;
  /** Whether those with the gap are drawn too. */
  readonly includeGap: boolean;
  /** Never drawn: the dilemmas the game already plays. */
  readonly excludedIds: readonly string[];
  /** Drawn only after every other: the dilemmas someone in the room played. */
  readonly playedIds: readonly string[];
}

export interface FindCandidatesOutput {
  readonly candidates: readonly {
    readonly dilemmaId: string;
    readonly type: DilemmaType;
    readonly scale: Scale;
    readonly minimumAge: MinimumAge;
    /** Whether a player of the room takes the place of "someone in the group" in it. */
    readonly hasGap: boolean;
  }[];
}

/**
 * What Dilemmas publishes to the other contexts to put a game together: at most as many public
 * dilemmas that match as asked for, drawn at random and those nobody played first, each with its id
 * and its classification, and nothing else of it.
 */
export interface FindCandidates {
  execute(input: FindCandidatesInput): Promise<FindCandidatesOutput>;
}

export class FindCandidatesUseCase implements FindCandidates {
  readonly #dilemmaQueries: DilemmaQueries;

  constructor(dilemmaQueries: DilemmaQueries) {
    this.#dilemmaQueries = dilemmaQueries;
  }

  async execute(criteria: FindCandidatesInput): Promise<FindCandidatesOutput> {
    new LanguageVO(criteria.language);
    const found = await this.#dilemmaQueries.candidatesOf(criteria);
    return { candidates: found.map(({ id, ...candidate }) => ({ dilemmaId: id, ...candidate })) };
  }
}
