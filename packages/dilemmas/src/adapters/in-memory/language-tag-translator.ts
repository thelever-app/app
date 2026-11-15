import type { TranslatableContent, Translator } from '../../application/ports/translator.port.ts';

/**
 * Translates by writing the language in front of every text, as `en: text`, so a test can tell
 * each language apart without calling a model. The gap stays as it is.
 */
export class LanguageTagTranslator implements Translator {
  async translate(
    content: TranslatableContent,
    _from: string,
    to: readonly string[],
  ): Promise<ReadonlyMap<string, TranslatableContent>> {
    return new Map(to.map((language) => [language, inLanguage(content, language)]));
  }
}

function inLanguage(content: TranslatableContent, language: string): TranslatableContent {
  const tag = (text: string) => `${language}: ${text}`;
  return {
    name: tag(content.name),
    text: tag(content.text),
    options: content.options.map(tag),
    // A tag stays one word in lower case.
    tags: content.tags.map((value) => `${language}-${value}`),
    ...(content.arguments && {
      arguments: {
        ...(content.arguments.context !== undefined && { context: tag(content.arguments.context) }),
        options: content.arguments.options.map((option) => ({
          for: tag(option.for),
          against: tag(option.against),
        })),
      },
    }),
  };
}
