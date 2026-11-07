import {
  DilemmaNotFoundError as DilemmasNotFoundError,
  type GetDilemmas,
  type GetDilemmasInput,
  type GetDilemmasOutput,
  type SearchDilemmas,
} from '@thelever-app/dilemmas/published';
import {
  type CatalogDilemma,
  type DilemmaCatalog,
  type DilemmaContent,
  DilemmaNotFoundError,
  type DilemmaSearch,
  type GameDilemma,
} from '@thelever-app/game';

/**
 * The anticorruption layer between Game and Dilemmas (ADR 0001): implements the catalog Game asks
 * for on top of the query Dilemmas publishes, and translates its answers and errors to Game.
 */
export class PublishedDilemmasCatalog implements DilemmaCatalog {
  readonly #getDilemmas: GetDilemmas;
  readonly #searchDilemmas: SearchDilemmas;

  constructor(getDilemmas: GetDilemmas, searchDilemmas: SearchDilemmas) {
    this.#getDilemmas = getDilemmas;
    this.#searchDilemmas = searchDilemmas;
  }

  async findOptionIds(dilemmaIds: readonly string[]): Promise<readonly GameDilemma[]> {
    // The structure does not depend on the language: ask for the original content.
    const found = await this.#find({ dilemmas: dilemmaIds.map((dilemmaId) => ({ dilemmaId })) });
    return found.map(({ dilemmaId, version, options }) => ({
      dilemmaId,
      version,
      optionIds: options.map(({ optionId }) => optionId),
    }));
  }

  async findContents(
    dilemmas: readonly { readonly dilemmaId: string; readonly version: number }[],
    language: string,
  ): Promise<readonly DilemmaContent[]> {
    const found = await this.#find({ dilemmas, language });
    return found.map(({ dilemmaId, text, options }) => ({ dilemmaId, text, options }));
  }

  async search(criteria: DilemmaSearch): Promise<readonly CatalogDilemma[]> {
    const { dilemmas } = await this.#searchDilemmas.execute(criteria);
    // Game keeps the version a game plays when it starts, not when it is found.
    return dilemmas.map(({ dilemmaId, text, minimumAge, category, tags }) => ({
      dilemmaId,
      text,
      minimumAge,
      category,
      tags,
    }));
  }

  async #find(input: GetDilemmasInput): Promise<GetDilemmasOutput['dilemmas']> {
    try {
      const { dilemmas } = await this.#getDilemmas.execute(input);
      return dilemmas;
    } catch (error) {
      if (error instanceof DilemmasNotFoundError) {
        throw new DilemmaNotFoundError(error.dilemmaId);
      }
      throw error;
    }
  }
}
