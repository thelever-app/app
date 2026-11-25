import type { Category } from '../../domain/vos/category.vo.ts';
import type { MinimumAge } from '../../domain/vos/minimum-age.vo.ts';
import { openByLink, openToStartARoom } from '../open-by-link.ts';
import type { DilemmaRepository } from '../ports/dilemma-repository.port.ts';

export interface GetDilemmaPreviewInput {
  readonly publicId: string;
  /** To start a room with it, which may be one for adults; else, to vote it alone, as on the web. */
  readonly toStartARoom?: boolean;
  /** Whether who asks is under 18, who never sees a dilemma for adults. */
  readonly underEighteen?: boolean;
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
 * What the screens to play a dilemma with the group and to vote it alone show of it, from the
 * public id a link carries, so nobody reaches a dilemma by guessing ids. To vote it alone, only one
 * the public web shows: public, in the general catalog, suitable from 16 and not compromising. To
 * start a room, also one for adults, which someone under 18 is told is only for adults. Any other is
 * not found, as one that does not exist: DilemmaNotFoundError.
 */
export interface GetDilemmaPreview {
  execute(input: GetDilemmaPreviewInput): Promise<GetDilemmaPreviewOutput>;
}

export class GetDilemmaPreviewUseCase implements GetDilemmaPreview {
  readonly #dilemmaRepository: DilemmaRepository;

  constructor(dilemmaRepository: DilemmaRepository) {
    this.#dilemmaRepository = dilemmaRepository;
  }

  async execute({
    publicId,
    toStartARoom = false,
    underEighteen = false,
  }: GetDilemmaPreviewInput): Promise<GetDilemmaPreviewOutput> {
    const dilemma = toStartARoom
      ? await openToStartARoom(this.#dilemmaRepository, publicId, underEighteen)
      : await openByLink(this.#dilemmaRepository, publicId);
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
