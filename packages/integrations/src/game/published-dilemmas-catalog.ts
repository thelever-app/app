import {
  DilemmaNotFoundError as DilemmasNotFoundError,
  type FindDilemmaIds,
  GAP_MARKER as DILEMMAS_GAP_MARKER,
  type GetDilemmas,
  type GetDilemmasInput,
  type GetDilemmasOutput,
  InvalidPageError as DilemmasInvalidPageError,
  type SearchDilemmas,
} from '@thelever-app/dilemmas/published';
import {
  type CandidateSearch,
  type CatalogPage,
  type DilemmaCatalog,
  type DilemmaContent,
  DilemmaNotFoundError,
  GAP_MARKER,
  type DilemmaSearch,
  type GameDilemma,
  InvalidPageError,
  type SearchPage,
} from '@thelever-app/game';

/**
 * The anticorruption layer between Game and Dilemmas (ADR 0001): implements the catalog Game asks
 * for on top of the query Dilemmas publishes, and translates its answers and errors to Game.
 */
export class PublishedDilemmasCatalog implements DilemmaCatalog {
  readonly #getDilemmas: GetDilemmas;
  readonly #searchDilemmas: SearchDilemmas;
  readonly #findDilemmaIds: FindDilemmaIds;

  constructor(
    getDilemmas: GetDilemmas,
    searchDilemmas: SearchDilemmas,
    findDilemmaIds: FindDilemmaIds,
  ) {
    this.#getDilemmas = getDilemmas;
    this.#searchDilemmas = searchDilemmas;
    this.#findDilemmaIds = findDilemmaIds;
  }

  async findOptionIds(dilemmaIds: readonly string[]): Promise<readonly GameDilemma[]> {
    // The structure does not depend on the language: ask for the original content.
    const found = await this.#find({ dilemmas: dilemmaIds.map((dilemmaId) => ({ dilemmaId })) });
    return found.map(({ dilemmaId, version, options, hasGap }) => ({
      dilemmaId,
      version,
      optionIds: options.map(({ optionId }) => optionId),
      hasGap,
    }));
  }

  async findContents(
    dilemmas: readonly { readonly dilemmaId: string; readonly version: number }[],
    language: string,
  ): Promise<readonly DilemmaContent[]> {
    const found = await this.#find({ dilemmas, language });
    return found.map(({ dilemmaId, text, options, language: read }) => ({
      dilemmaId,
      text: withGameGap(text),
      options: options.map((option) => ({ ...option, text: withGameGap(option.text) })),
      language: read,
    }));
  }

  async findCandidateIds(criteria: CandidateSearch): Promise<readonly string[]> {
    const { dilemmaIds } = await this.#findDilemmaIds.execute(criteria);
    return dilemmaIds;
  }

  async search(criteria: DilemmaSearch, { size, after }: SearchPage): Promise<CatalogPage> {
    try {
      const { dilemmas, next } = await this.#searchDilemmas.execute({
        ...criteria,
        size,
        ...(after !== undefined && { after }),
      });
      // Game keeps the version a game plays when it starts, not when it is found.
      return {
        dilemmas: dilemmas.map(
          ({ dilemmaId, text, minimumAge, category, tags, optionCount, compromising }) => ({
            dilemmaId,
            text,
            minimumAge,
            category,
            tags,
            optionCount,
            compromising,
          }),
        ),
        ...(next !== undefined && { next }),
      };
    } catch (error) {
      if (error instanceof DilemmasInvalidPageError) throw new InvalidPageError(after ?? '');
      throw error;
    }
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

/** The gap as Game marks it, in a text where Dilemmas marked it its own way. */
function withGameGap(text: string): string {
  return text.replaceAll(DILEMMAS_GAP_MARKER, GAP_MARKER);
}
