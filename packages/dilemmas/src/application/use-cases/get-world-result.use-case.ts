import {
  MINIMUM_WORLD_ANSWERS,
  WorldResult,
  assertPrediction,
} from '../../domain/vos/world-result.vo.ts';
import { ballotOf } from '../ballot.ts';
import { openByLink } from '../open-by-link.ts';
import type { DilemmaRepository } from '../ports/dilemma-repository.port.ts';
import type { WorldResultRepository } from '../ports/world-result-repository.port.ts';

export interface GetWorldResultInput {
  /** The dilemma, by the public id of the link that opened it, in its language. */
  readonly publicId: string;
  /** The option the device voted, which it keeps and sends with its prediction; neither is kept here. */
  readonly optionId: string;
  /** The share of the world the device predicted voted the same, in whole percentage points. */
  readonly prediction: number;
}

export type GetWorldResultOutput =
  | {
      /** Too few answers to show it, which says only how many there are and how many it needs. */
      readonly shown: false;
      readonly answers: number;
      readonly needed: number;
    }
  | {
      readonly shown: true;
      readonly answers: number;
      /** Each option of the language of the link, with its share in whole percentages that add up to 100. */
      readonly options: readonly { readonly optionId: string; readonly percentage: number }[];
      /** The share of the option the device voted, and how many points its prediction was off. */
      readonly yours: { readonly percentage: number; readonly predictionOff: number };
    };

/**
 * How the world voted the dilemma, its translations included, as published once a day, for the
 * device that voted it: without figures below 20 answers (MINIMUM_WORLD_ANSWERS).
 */
export class GetWorldResultUseCase {
  readonly #dilemmaRepository: DilemmaRepository;
  readonly #worldResults: WorldResultRepository;

  constructor(dilemmaRepository: DilemmaRepository, worldResults: WorldResultRepository) {
    this.#dilemmaRepository = dilemmaRepository;
    this.#worldResults = worldResults;
  }

  async execute({
    publicId,
    optionId,
    prediction,
  }: GetWorldResultInput): Promise<GetWorldResultOutput> {
    assertPrediction(prediction);
    const dilemma = await openByLink(this.#dilemmaRepository, publicId);
    const { dilemmaId, version, position } = ballotOf(dilemma, optionId);
    const counts = await this.#worldResults.publishedCountsOf(dilemmaId, version);
    const result = new WorldResult(dilemma.options.map((_, at) => counts.get(at) ?? 0));
    if (!result.isShown) {
      return { shown: false, answers: result.answers, needed: MINIMUM_WORLD_ANSWERS };
    }
    const percentages = result.percentages();
    return {
      shown: true,
      answers: result.answers,
      options: dilemma.options.map(({ id }, at) => ({
        optionId: id,
        percentage: percentages[at]!,
      })),
      yours: {
        percentage: percentages[position]!,
        predictionOff: result.predictionOff(position, prediction),
      },
    };
  }
}
