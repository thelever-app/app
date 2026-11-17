import type { Dilemma, TranslationOf } from '../../domain/entities/dilemma.ts';

export interface DilemmaRepository {
  /**
   * Adds the current version if it is new and keeps the status, the visibility, the name and
   * the arguments of the current version; the content of a version already saved never changes.
   */
  save(dilemma: Dilemma): Promise<void>;
  /** The dilemma at its current version. */
  findById(id: string): Promise<Dilemma | undefined>;
  /** The dilemma with that public id, at its current version. */
  findByPublicId(publicId: string): Promise<Dilemma | undefined>;
  /** The dilemma as it was at that version, to read what was played; never to revise it. */
  findVersion(id: string, version: number): Promise<Dilemma | undefined>;
  /** The translation of that version of an original into that language, at the version that translates it. */
  findTranslation(original: TranslationOf, language: string): Promise<Dilemma | undefined>;
  /**
   * The dilemmas of the curated catalog with a public page, originals and translations, at their
   * current version, which is in the general catalog: public, named, suitable from 16, not
   * compromising and with reviewed arguments; a translation, also of the current version of its
   * original, public and in the catalog. The rest of the catalog never leaves the database for the web.
   */
  findWithPublicPage(): Promise<Dilemma[]>;
  /**
   * The public originals of the curated catalog whose current version was withdrawn from it and
   * could have had a page: suitable from 16, not compromising, named and with reviewed arguments. The rest never
   * were on the web, and the web does not say they existed.
   */
  findWithdrawnFromCatalog(): Promise<Dilemma[]>;
}
