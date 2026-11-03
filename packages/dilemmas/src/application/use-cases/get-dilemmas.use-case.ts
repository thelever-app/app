import { DilemmaNotFoundError } from '../errors/dilemma-not-found.error.ts';
import type { DilemmaRepository } from '../ports/dilemma-repository.port.ts';

export interface GetDilemmasInput {
  /** In the order they are wanted back; without a version, the current one. */
  readonly dilemmas: readonly { readonly dilemmaId: string; readonly version?: number }[];
  /** Without a language, the content comes in the language each dilemma was written in. */
  readonly language?: string;
}

export interface GetDilemmasOutput {
  readonly dilemmas: readonly {
    readonly dilemmaId: string;
    readonly version: number;
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

  async execute({ dilemmas, language }: GetDilemmasInput): Promise<GetDilemmasOutput> {
    const found = await Promise.all(
      dilemmas.map(async ({ dilemmaId, version }) => {
        const dilemma =
          version === undefined
            ? await this.#dilemmaRepository.findById(dilemmaId)
            : await this.#dilemmaRepository.findVersion(dilemmaId, version);
        if (!dilemma) throw new DilemmaNotFoundError(dilemmaId, version);

        const { text, options } = dilemma.contentIn(language ?? dilemma.language);
        return {
          dilemmaId,
          version: dilemma.version,
          text,
          options: options.map(({ id, text }) => ({ optionId: id, text })),
        };
      }),
    );
    return { dilemmas: found };
  }
}
