import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { FactsTranslator, Language } from '@thelever-app/moderation';
import { z } from 'zod';
import type { MessagesParser } from '../catalog-import/anthropic-translator.ts';

/** The model that translates the catalog: the facts are a sentence or two. */
const MODEL = 'claude-haiku-5-5';
const MAX_TOKENS = 4_000;

const LANGUAGE_NAMES: Readonly<Record<Exclude<Language, 'es'>, string>> = {
  en: 'English',
  fr: 'French (France)',
  de: 'German (Germany)',
  it: 'Italian',
  pt: 'European Portuguese (Portugal)',
  ca: 'Catalan',
};

const SYSTEM = `You translate, for TheLever, a party game, the facts a moderator wrote in Spanish to explain a decision on a nickname or a notice to the person it concerns. Translate them into each language asked for, plainly and faithfully, in the same register: add nothing, leave nothing out and keep any quoted text as it is.`;

const OUTPUT = z.object(
  Object.fromEntries(
    Object.keys(LANGUAGE_NAMES).map((language) => [language, z.string()]),
  ) as Record<Exclude<Language, 'es'>, z.ZodString>,
);

/** The translator stopped before giving every language. */
export class FactsTranslationError extends Error {
  constructor(reason: string | null) {
    super(`the facts could not be translated (${reason ?? 'no output'})`);
    this.name = 'FactsTranslationError';
  }
}

/**
 * Translates the facts of a decision with Claude, in a single request for every language. The team
 * writes the facts in Spanish and without personal data, so nothing of a player reaches the model.
 */
export class AnthropicFactsTranslator implements FactsTranslator {
  readonly #messages: MessagesParser;

  constructor(messages: MessagesParser) {
    this.#messages = messages;
  }

  async translate(facts: string): Promise<Readonly<Record<Language, string>>> {
    const response = await this.#messages.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Translate into ${Object.values(LANGUAGE_NAMES).join(', ')}:\n\n${facts}`,
        },
      ],
      output_config: { format: zodOutputFormat(OUTPUT) },
    });
    const parsed = OUTPUT.safeParse(response.parsed_output);
    if (response.stop_reason !== 'end_turn' || !parsed.success) {
      throw new FactsTranslationError(response.stop_reason);
    }
    return { es: facts, ...parsed.data };
  }
}
