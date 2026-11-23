import { idOf } from '../catalog-number.ts';
import type { DilemmaRepository } from '../ports/dilemma-repository.port.ts';

/** How another context finds the dilemma a person points to, by its link or its number. */
export interface FindDilemmaOfReference {
  /** The id of the dilemma, or null if the reference points to none. */
  execute(reference: string): Promise<string | null>;
}

/** The number at the end of the address of a page of the public web, and its language. */
const PAGE = /^(?:https?:\/\/[^/]+)?\/([a-z]{2})\/[^?#]*-(\d+)\/?(?:[?#].*)?$/i;
/** A number of the catalog alone, as «123» or «#123». */
const NUMBER = /^#?\s*(\d+)$/;
/** A link of the app to a dilemma, by its public id: the last segment of the address. */
const PUBLIC_ID = /^(?:https?:\/\/[^/]+)?\/[^?#]*\/([A-Za-z0-9_-]{6,})\/?(?:[?#].*)?$/;

/**
 * The dilemma a notice of the web form points to: the page of the public web it links to, in the
 * language of that page if the dilemma is translated into it; a number of the catalog; or the link
 * of the app with its public id.
 */
export class FindDilemmaOfReferenceUseCase implements FindDilemmaOfReference {
  readonly #dilemmaRepository: DilemmaRepository;

  constructor(dilemmaRepository: DilemmaRepository) {
    this.#dilemmaRepository = dilemmaRepository;
  }

  async execute(reference: string): Promise<string | null> {
    const trimmed = reference.trim();
    const page = PAGE.exec(trimmed);
    if (page) return this.#ofNumber(Number(page[2]), page[1]!.toLowerCase());
    const number = NUMBER.exec(trimmed);
    if (number) return this.#ofNumber(Number(number[1]));
    const publicId = PUBLIC_ID.exec(trimmed)?.[1];
    if (publicId) return (await this.#dilemmaRepository.findByPublicId(publicId))?.id ?? null;
    return null;
  }

  async #ofNumber(number: number, language?: string): Promise<string | null> {
    for (const id of language === undefined
      ? [idOf(number)]
      : [idOf(number, language), idOf(number)]) {
      if (await this.#dilemmaRepository.findById(id)) return id;
    }
    return null;
  }
}
