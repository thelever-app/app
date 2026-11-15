import { DilemmaNotFoundError } from '../errors/dilemma-not-found.error.ts';
import type { Dilemma } from '../../domain/entities/dilemma.ts';
import { hasGap } from '../../domain/vos/gap.ts';
import { LanguageVO } from '../../domain/vos/language.vo.ts';
import type { DilemmaRepository } from '../ports/dilemma-repository.port.ts';

export interface GetDilemmasInput {
  /** In the order they are wanted back; without a version, the current one. */
  readonly dilemmas: readonly { readonly dilemmaId: string; readonly version?: number }[];
  /**
   * The language of the player. Without it, or without a readable translation of the version
   * played into it, the content comes in the language of the dilemma played.
   */
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
    /** The language of the text and the options returned. */
    readonly language: string;
  }[];
}

/**
 * What Dilemmas publishes to the other contexts: the content of the versions played, read in the
 * language of the player through the original or a translation of the same version, always with
 * the ids of the options of the dilemma played. It throws DilemmaNotFoundError if a dilemma, or
 * that version of it, does not exist.
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
    if (language !== undefined) new LanguageVO(language);
    const found = await Promise.all(
      dilemmas.map(async ({ dilemmaId, version }) => {
        const played =
          version === undefined
            ? await this.#dilemmaRepository.findById(dilemmaId)
            : await this.#dilemmaRepository.findVersion(dilemmaId, version);
        if (!played) throw new DilemmaNotFoundError(dilemmaId, version);

        const read = (language && (await this.#readIn(played, language))) || played;
        return {
          dilemmaId,
          version: played.version,
          text: read.text,
          // Option n of every language version translates option n of the original.
          options: played.options.map(({ id }, index) => ({
            optionId: id,
            text: read.options[index]!.text,
          })),
          hasGap: hasGap([played.text, ...played.options.map((option) => option.text)]),
          language: read.language,
        };
      }),
    );
    return { dilemmas: found };
  }

  /** The original or the translation into that language of the version played, if a player may read it. */
  async #readIn(played: Dilemma, language: string): Promise<Dilemma | undefined> {
    if (played.language === language) return played;
    const original = played.translationOf ?? { dilemmaId: played.id, version: played.version };
    const candidate = played.translationOf
      ? await this.#originalOrTranslation(original, language)
      : await this.#dilemmaRepository.findTranslation(original, language);
    return candidate?.canBeRead() && candidate.options.length === played.options.length
      ? candidate
      : undefined;
  }

  async #originalOrTranslation(
    original: { readonly dilemmaId: string; readonly version: number },
    language: string,
  ): Promise<Dilemma | undefined> {
    const found = await this.#dilemmaRepository.findVersion(original.dilemmaId, original.version);
    if (found?.language === language) return found;
    return this.#dilemmaRepository.findTranslation(original, language);
  }
}
