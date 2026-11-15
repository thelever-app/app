import type { Dilemma, TranslationOf } from '../../domain/entities/dilemma.ts';

export interface DilemmaRepository {
  /**
   * Adds the current version if it is new and keeps the status, the visibility, the name and
   * the arguments of the current version; the content of a version already saved never changes.
   */
  save(dilemma: Dilemma): Promise<void>;
  /** The dilemma at its current version. */
  findById(id: string): Promise<Dilemma | undefined>;
  /** The dilemma as it was at that version, to read what was played; never to revise it. */
  findVersion(id: string, version: number): Promise<Dilemma | undefined>;
  /** The translation of that version of an original into that language, at the version that translates it. */
  findTranslation(original: TranslationOf, language: string): Promise<Dilemma | undefined>;
}
