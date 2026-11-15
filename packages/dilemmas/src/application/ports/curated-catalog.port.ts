import type { Category } from '../../domain/vos/category.vo.ts';
import type { MinimumAge } from '../../domain/vos/minimum-age.vo.ts';

/** The arguments of a dilemma of the curated catalog, option n arguing option n. */
export interface CuratedArguments {
  readonly context?: string;
  readonly options: readonly { readonly for: string; readonly against: string }[];
}

/** An approved dilemma of the curated catalog as the curation team keeps it, in the language it is written in. */
export interface CuratedDilemma {
  /** Its number in the catalog, which never changes. */
  readonly number: number;
  readonly language: string;
  readonly name: string;
  /** With the gap "someone in the group" written as Dilemmas keeps it. */
  readonly text: string;
  readonly options: readonly string[];
  readonly category: Category;
  readonly minimumAge: MinimumAge;
  readonly tags: readonly string[];
  /** Only when the curation team has reviewed them. */
  readonly arguments?: CuratedArguments;
}

/** A dilemma of the curated catalog that could not be read, and why. */
export interface UnreadableDilemma {
  readonly number: number;
  readonly reason: string;
}

export interface CuratedCatalogContent {
  readonly approved: readonly CuratedDilemma[];
  readonly discarded: readonly number[];
  readonly unreadable: readonly UnreadableDilemma[];
}

/** Where the curation team approves and discards the dilemmas of the catalog. */
export interface CuratedCatalog {
  /**
   * The approved dilemmas, which go to the catalog of the app, and the numbers of the discarded
   * ones, which leave it; the ones that cannot be read come apart, not as an error.
   */
  read(): Promise<CuratedCatalogContent>;
}
