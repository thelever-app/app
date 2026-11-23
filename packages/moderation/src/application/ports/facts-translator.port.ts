import type { Language } from '../../domain/vos/language.vo.ts';

/**
 * Translates the facts the team wrote into every language of the app, so whoever the decision is
 * about reads them in theirs. The team writes them without personal data.
 */
export interface FactsTranslator {
  translate(facts: string): Promise<Readonly<Record<Language, string>>>;
}
