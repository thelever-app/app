import {
  DilemmaNotFoundError as DilemmasContextNotFoundError,
  type GetDilemmasInput,
  type GetDilemmasUseCase,
} from '@thelever-app/dilemmas';
import { DilemmaNotFoundError } from '../../application/errors/dilemma-not-found.error.ts';
import type {
  DilemmaCatalog,
  DilemmaContent,
} from '../../application/ports/dilemma-catalog.port.ts';
import type { GameDilemma } from '../../domain/entities/game.ts';

/** Asks the Dilemmas context through its use case and translates its answers and errors to the Game context. */
export class DilemmasContextCatalog implements DilemmaCatalog {
  readonly #getDilemmas: GetDilemmasUseCase;

  constructor(getDilemmas: GetDilemmasUseCase) {
    this.#getDilemmas = getDilemmas;
  }

  async findOptionIds(dilemmaIds: readonly string[]): Promise<readonly GameDilemma[]> {
    // The structure does not depend on the language: ask for the original content.
    const contents = await this.#find({ dilemmaIds });
    return contents.map(({ dilemmaId, options }) => ({
      dilemmaId,
      optionIds: options.map(({ optionId }) => optionId),
    }));
  }

  async findContents(
    dilemmaIds: readonly string[],
    language: string,
  ): Promise<readonly DilemmaContent[]> {
    return this.#find({ dilemmaIds, language });
  }

  async #find(input: GetDilemmasInput): Promise<readonly DilemmaContent[]> {
    try {
      const { dilemmas } = await this.#getDilemmas.execute(input);
      return dilemmas;
    } catch (error) {
      if (error instanceof DilemmasContextNotFoundError) {
        throw new DilemmaNotFoundError(error.dilemmaId);
      }
      throw error;
    }
  }
}
