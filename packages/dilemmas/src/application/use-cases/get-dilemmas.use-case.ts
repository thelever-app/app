import { DilemmaNotFoundError } from '../errors/dilemma-not-found.error.ts';
import { hasGap } from '../../domain/vos/gap.ts';
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
    /** Whether a player of the room takes the place of "someone in the group" in it. */
    readonly hasGap: boolean;
  }[];
}

/**
 * What Dilemmas publishes to the other contexts: the content of some dilemmas in one language,
 * falling back to the original while there is no translation. It throws DilemmaNotFoundError
 * if a dilemma, or that version of it, does not exist.
 */
export interface GetDilemmas {
  execute(input: GetDilemmasInput): Promise<GetDilemmasOutput>;
}

export class GetDilemmasUseCase implements GetDilemmas {
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
          hasGap: hasGap([dilemma.text, ...dilemma.options.map((option) => option.text)]),
        };
      }),
    );
    return { dilemmas: found };
  }
}
