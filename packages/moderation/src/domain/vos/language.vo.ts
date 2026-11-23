/** The languages of the app: a player reads a dilemma, and a person writes a notice, in one of them. */
export const LANGUAGES = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca'] as const;
export type Language = (typeof LANGUAGES)[number];

export function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value);
}
