/** The id of the dilemma with that number of the curated catalog, or of its translation into a language. */
export function idOf(number: number, language?: string): string {
  return language === undefined ? `dlm-${number}` : `dlm-${number}-${language}`;
}

/**
 * The ids of the curated catalog, its originals and their translations, as a pattern that
 * JavaScript and PostgreSQL read alike.
 */
export const CATALOG_ID_PATTERN = '^dlm-([1-9][0-9]*)(-[a-z]{2}(-[A-Z]{2})?)?$';

const CATALOG_ID = new RegExp(CATALOG_ID_PATTERN);

/** The number of the curated catalog a dilemma or its translation has; none if it is not from that catalog. */
export function numberOf(dilemmaId: string): number | undefined {
  const match = CATALOG_ID.exec(dilemmaId);
  return match ? Number(match[1]) : undefined;
}

/**
 * What moderating a dilemma reaches: the dilemma and, if it is of the curated catalog, its original
 * and its translations into those languages.
 */
export function familyOf(dilemmaId: string, languages: readonly string[]): string[] {
  const number = numberOf(dilemmaId);
  return number === undefined
    ? [dilemmaId]
    : [idOf(number), ...languages.map((language) => idOf(number, language))];
}
