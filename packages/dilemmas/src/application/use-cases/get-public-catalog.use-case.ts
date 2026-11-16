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
  /** Whether search engines may index its page: only with reviewed arguments. */
  readonly indexable: boolean;
  /** Only when they are reviewed. */
  readonly arguments?: ArgumentsSnapshot;
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
 * What the public web shows: each dilemma of the curated catalog in the general catalog and
 * suitable from 16, in its language and in each translation of its current version, and the
 * numbers of the ones withdrawn. The dilemmas for adults have no page: the web asks no age.
 */
export class GetPublicCatalogUseCase {
  readonly #dilemmaRepository: DilemmaRepository;

  constructor(dilemmaRepository: DilemmaRepository) {
    this.#dilemmaRepository = dilemmaRepository;
  }

  async execute(): Promise<GetPublicCatalogOutput> {
    const found = (await this.#dilemmaRepository.findPublicCatalog()).filter(
      (dilemma) => numberOf(dilemma.id) !== undefined,
    );
    const originals = new Map(
      found.filter((dilemma) => !dilemma.translationOf).map((dilemma) => [dilemma.id, dilemma]),
    );
    const dilemmas = found
      .filter((dilemma) => this.#hasPage(dilemma, originals))
      .map((dilemma) => publicDilemmaOf(dilemma))
      .sort((a, b) => a.number - b.number || a.language.localeCompare(b.language));
    const withdrawn = [...originals.values()]
      .filter((original) => original.status === 'withdrawn')
      .map((original) => ({ number: numberOf(original.id)!, category: original.category }))
      .sort((a, b) => a.number - b.number);
    return { dilemmas, withdrawn };
  }

  /** In the catalog, for everyone, named and, if a translation, of the current version of its original. */
  #hasPage(dilemma: Dilemma, originals: ReadonlyMap<string, Dilemma>): boolean {
    if (dilemma.status !== 'in-catalog' || !dilemma.isSuitableForMinors() || !dilemma.name) {
      return false;
    }
    const of = dilemma.translationOf;
    if (!of) return true;
    const original = originals.get(of.dilemmaId);
    return (
      original?.status === 'in-catalog' &&
      original.version === of.version &&
      original.options.length === dilemma.options.length
    );
  }
}

function publicDilemmaOf(dilemma: Dilemma): PublicDilemma {
  const args = dilemma.arguments;
  return {
    number: numberOf(dilemma.id)!,
    dilemmaId: dilemma.id,
    publicId: dilemma.publicId,
    language: dilemma.language,
    name: dilemma.name!,
    text: dilemma.text,
    options: dilemma.options.map(({ id, text }) => ({ optionId: id, text })),
    category: dilemma.category,
    indexable: args !== undefined,
    ...(args && { arguments: args }),
  };
}
