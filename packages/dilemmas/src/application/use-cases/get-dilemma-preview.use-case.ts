import type { Category } from '../../domain/vos/category.vo.ts';
import type { MinimumAge } from '../../domain/vos/minimum-age.vo.ts';
import { DilemmaNotFoundError } from '../errors/dilemma-not-found.error.ts';
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
  readonly minimumAge: MinimumAge;
  /** The language it is written or translated in, which the room plays its dilemmas in. */
  readonly language: string;
}

/**
 * What the screen to play a dilemma with the group shows of it, from the public id a link carries,
 * so nobody reaches a dilemma by guessing ids. One that cannot be read is not found, as one that
 * does not exist: DilemmaNotFoundError.
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
    const dilemma = await this.#dilemmaRepository.findByPublicId(publicId);
    if (!dilemma?.canBeRead()) throw new DilemmaNotFoundError(publicId);
    return {
      dilemmaId: dilemma.id,
      ...(dilemma.name !== undefined && { name: dilemma.name }),
      category: dilemma.category,
      optionCount: dilemma.options.length,
      minimumAge: dilemma.minimumAge,
      language: dilemma.language,
    };
  }
}
