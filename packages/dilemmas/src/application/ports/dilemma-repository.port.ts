import type { Dilemma, DilemmaStatus, TranslationOf } from '../../domain/entities/dilemma.ts';
import type { MinimumAge } from '../../domain/vos/minimum-age.vo.ts';

/** How alike a word typed and part of a text or tag must be to match, as pg_trgm's word_similarity: one wrong letter still matches. */
export const WORD_SIMILARITY = 0.5;

/** Which public dilemmas to look for, at their current version; every criterion given must hold. */
export interface DilemmaCriteria {
  readonly dilemmaIds?: readonly string[];
  /** Any of them; an empty list finds nothing, and without it every category is searched. */
  readonly categories?: readonly string[];
  /**
   * What a player typed. Every word must be part of the text or a tag, or alike enough to one
   * (one wrong letter), without minding case or accents. The dilemmas found come first by a tag
   * equal to what was typed, then by how alike it is to the text or a tag.
   */
  readonly text?: string;
  /** 16 leaves out the dilemmas for adults. */
  readonly maximumMinimumAge: MinimumAge;
  readonly status: DilemmaStatus;
  /** Only the dilemmas written or translated in it; without it, every language. */
  readonly language?: string;
}

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
  /**
   * The public dilemmas that match, at their current version: with a text, the best matches
   * first and then by id; without one, by id. None is an empty list.
   */
  search(criteria: DilemmaCriteria): Promise<Dilemma[]>;
}
