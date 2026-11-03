import {
  DilemmaNotFoundError as DilemmasContextNotFoundError,
  type GetDilemmasInput,
  type GetDilemmasOutput,
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

  async #find(input: GetDilemmasInput): Promise<GetDilemmasOutput['dilemmas']> {
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
