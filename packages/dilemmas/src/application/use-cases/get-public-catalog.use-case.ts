import type { Dilemma } from '../../domain/entities/dilemma.ts';
import type { ArgumentsSnapshot } from '../../domain/vos/arguments.vo.ts';
import type { Category } from '../../domain/vos/category.vo.ts';
import { numberOf } from '../catalog-number.ts';
import type { DilemmaRepository } from '../ports/dilemma-repository.port.ts';

/** A dilemma as its public page shows it, in one language. */
export interface PublicDilemma {
  /** Its number in the curated catalog, the same in every language. */
  readonly number: number;
  readonly dilemmaId: string;
  /** What a link to play it carries. */
  readonly publicId: string;
  readonly language: string;
  readonly name: string;
  /** With the gap "someone in the group" as Dilemmas keeps it. */
  readonly text: string;
  readonly options: readonly { readonly optionId: string; readonly text: string }[];
  readonly category: Category;
  /** Reviewed: a dilemma without them has no page. */
  readonly arguments: ArgumentsSnapshot;
}

export interface GetPublicCatalogOutput {
  /** By number and then by language. */
  readonly dilemmas: readonly PublicDilemma[];
  /**
   * The dilemmas withdrawn from the catalog, whose pages no longer exist, by number: with the
   * category they had, to offer others like them.
   */
  readonly withdrawn: readonly { readonly number: number; readonly category: Category }[];
}

/**
 * What the public web shows: each dilemma of the curated catalog with a public page, in its
 * language and in each translation that has one, and the numbers of the ones withdrawn. Which
 * dilemmas have a page the repository decides, so the rest of the catalog never reaches the web.
 */
export class GetPublicCatalogUseCase {
  readonly #dilemmaRepository: DilemmaRepository;

  constructor(dilemmaRepository: DilemmaRepository) {
    this.#dilemmaRepository = dilemmaRepository;
  }

  async execute(): Promise<GetPublicCatalogOutput> {
    const [withPage, withdrawn] = await Promise.all([
      this.#dilemmaRepository.findWithPublicPage(),
      this.#dilemmaRepository.findWithdrawnFromCatalog(),
    ]);
    return {
      dilemmas: withPage
        .map((dilemma) => publicDilemmaOf(dilemma))
        .sort((a, b) => a.number - b.number || a.language.localeCompare(b.language)),
      withdrawn: withdrawn
        .map((dilemma) => ({ number: numberOf(dilemma.id)!, category: dilemma.category }))
        .sort((a, b) => a.number - b.number),
    };
  }
}

function publicDilemmaOf(dilemma: Dilemma): PublicDilemma {
  return {
    number: numberOf(dilemma.id)!,
    dilemmaId: dilemma.id,
    publicId: dilemma.publicId,
    language: dilemma.language,
    name: dilemma.name!,
    text: dilemma.text,
    options: dilemma.options.map(({ id, text }) => ({ optionId: id, text })),
    category: dilemma.category,
    arguments: dilemma.arguments!,
  };
}
