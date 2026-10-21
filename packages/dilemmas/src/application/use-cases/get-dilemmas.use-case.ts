import { DilemmaNotFoundError } from '../errors/dilemma-not-found.error.ts';
import type { DilemmaRepository } from '../ports/dilemma-repository.port.ts';

export interface GetDilemmasInput {
  /** In the order they are wanted back. */
  readonly dilemmaIds: readonly string[];
  /** Without a language, the content comes in the language each dilemma was written in. */
  readonly language?: string;
}

export interface GetDilemmasOutput {
  readonly dilemmas: readonly {
    readonly dilemmaId: string;
    readonly text: string;
    readonly options: readonly { readonly optionId: string; readonly text: string }[];
  }[];
}

/** The content of some dilemmas in one language, falling back to the original while there is no translation. */
export class GetDilemmasUseCase {
  readonly #dilemmaRepository: DilemmaRepository;

  constructor(dilemmaRepository: DilemmaRepository) {
    this.#dilemmaRepository = dilemmaRepository;
  }

  async execute({ dilemmaIds, language }: GetDilemmasInput): Promise<GetDilemmasOutput> {
    const dilemmas = await Promise.all(
      dilemmaIds.map(async (dilemmaId) => {
        const dilemma = await this.#dilemmaRepository.findById(dilemmaId);
        if (!dilemma) throw new DilemmaNotFoundError(dilemmaId);

        const { text, options } = dilemma.contentIn(language ?? dilemma.language);
        return {
          dilemmaId,
          text,
          options: options.map(({ id, text }) => ({ optionId: id, text })),
        };
      }),
    );
    return { dilemmas };
  }
}
