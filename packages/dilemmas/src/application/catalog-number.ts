/** The id of the dilemma with that number of the curated catalog, or of its translation into a language. */
export function idOf(number: number, language?: string): string {
  return language === undefined ? `dlm-${number}` : `dlm-${number}-${language}`;
}

const CATALOG_ID = /^dlm-([1-9]\d*)(-[a-z]{2}(-[A-Z]{2})?)?$/;

/** The number of the curated catalog a dilemma or its translation has; none if it is not from that catalog. */
export function numberOf(dilemmaId: string): number | undefined {
  const match = CATALOG_ID.exec(dilemmaId);
  return match ? Number(match[1]) : undefined;
}
