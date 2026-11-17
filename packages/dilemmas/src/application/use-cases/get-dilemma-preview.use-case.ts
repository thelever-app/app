import type { Category } from '../../domain/vos/category.vo.ts';
import type { MinimumAge } from '../../domain/vos/minimum-age.vo.ts';
import { openByLink } from '../open-by-link.ts';
import type { DilemmaRepository } from '../ports/dilemma-repository.port.ts';

export interface GetDilemmaPreviewInput {
  readonly publicId: string;
}

export interface GetDilemmaPreviewOutput {
  /** The id a room is created with. */
  readonly dilemmaId: string;
  readonly name?: string;
  readonly category: Category;
  readonly optionCount: number;
  /** As it reads, to vote it alone; with the gap "someone in the group" as Dilemmas keeps it. */
  readonly text: string;
  readonly options: readonly { readonly optionId: string; readonly text: string }[];
  /** The version of the original its votes alone count for, which a new version starts again. */
  readonly version: number;
  readonly minimumAge: MinimumAge;
  /** The language it is written or translated in, which the room plays its dilemmas in. */
  readonly language: string;
}

/**
 * What the screens to play a dilemma with the group and to vote it alone show of it, from the public id a link carries,
 * so nobody reaches a dilemma by guessing ids. Only a dilemma a new room may start with: public, in
 * the general catalog, suitable from 16 and not compromising, as the public web shows them. Any other is not found,
 * as one that does not exist: DilemmaNotFoundError.
 */
export interface GetDilemmaPreview {
  execute(input: GetDilemmaPreviewInput): Promise<GetDilemmaPreviewOutput>;
}

export class GetDilemmaPreviewUseCase implements GetDilemmaPreview {
  readonly #dilemmaRepository: DilemmaRepository;

  constructor(dilemmaRepository: DilemmaRepository) {
    this.#dilemmaRepository = dilemmaRepository;
  }

  async execute({ publicId }: GetDilemmaPreviewInput): Promise<GetDilemmaPreviewOutput> {
    const dilemma = await openByLink(this.#dilemmaRepository, publicId);
    return {
      dilemmaId: dilemma.id,
      ...(dilemma.name !== undefined && { name: dilemma.name }),
      category: dilemma.category,
      optionCount: dilemma.options.length,
      text: dilemma.text,
      options: dilemma.options.map(({ id, text }) => ({ optionId: id, text })),
      version: dilemma.translationOf?.version ?? dilemma.version,
      minimumAge: dilemma.minimumAge,
      language: dilemma.language,
    };
  }
}
