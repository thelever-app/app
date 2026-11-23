import type { FactsTranslator } from '../../application/ports/facts-translator.port.ts';
import { LANGUAGES, type Language } from '../../domain/vos/language.vo.ts';

/** Translates by tagging the facts with each language: «[fr] …». The facts in Spanish stay as they are. */
export class LanguageTagFactsTranslator implements FactsTranslator {
  async translate(facts: string): Promise<Readonly<Record<Language, string>>> {
    return Object.fromEntries(
      LANGUAGES.map((language) => [language, language === 'es' ? facts : `[${language}] ${facts}`]),
    ) as Record<Language, string>;
  }
}
