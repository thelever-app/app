import type Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { TranslatableContent, Translator } from '@thelever-app/dilemmas';
import { GAP_MARKER } from '@thelever-app/dilemmas/published';
import { z } from 'zod';

/** The cheapest model that keeps a dilemma intact, chosen by Mario on 15 November. */
const MODEL = 'claude-haiku-5-5';
/** Six languages of one dilemma, with its arguments, fit well below it. */
const MAX_TOKENS = 16_000;

/** How the prompt names each language; Portuguese is that of Portugal, since Brazil is a blocked country. */
const LANGUAGE_NAMES: Readonly<Record<string, string>> = {
  es: 'Spanish (Spain)',
  en: 'English',
  fr: 'French (France)',
  de: 'German (Germany)',
  it: 'Italian',
  pt: 'European Portuguese (Portugal)',
  ca: 'Catalan',
};

const SYSTEM = `You translate moral dilemmas for TheLever, a party game where a group of friends votes in private on each dilemma and then discusses the result.

Translate the dilemma you are given into each language asked for, so that a native speaker reads it as if it had been written in their language:
- Keep the moral conflict exactly as it is: the same facts, the same stakes, the same people involved. Do not soften, sharpen, explain or add anything.
- Keep the options as many and in the same order. Option n of the translation translates option n of the original, and each option stays as short as it is.
- The text ${GAP_MARKER} stands for the nickname of a player of the room. Copy it as it is, the same number of times and in the same field, and write the sentence so it reads well with a name in its place. Never add it where it is not.
- Use the everyday register a friend would use. Adapt idioms, currencies, foods and places only when the original would sound foreign, never the moral content.
- Translate the name as a short title in the same style.
- Translate each tag as one or two words in lower case.
- When there are arguments, translate the context if there is one (null if there is none) and, for each option, the argument for it and the argument against it, keeping their order. When there are no arguments, give null.`;

/** The arguments the model gives, with a context exactly when the original has one. */
function argumentsLike(original: NonNullable<TranslatableContent['arguments']>) {
  return z.object({
    context: original.context === undefined ? z.null() : z.string(),
    options: z.array(z.object({ for: z.string(), against: z.string() })),
  });
}

/**
 * What the model gives: one translation per language asked for, named by its code, with arguments
 * exactly when the original has them, so the model cannot leave them out.
 */
function outputIn(languages: readonly string[], original: TranslatableContent) {
  return z.object({
    translations: z.array(
      z.object({
        language: z.enum(languages as [string, ...string[]]),
        name: z.string(),
        text: z.string(),
        options: z.array(z.string()),
        tags: z.array(z.string()),
        arguments: original.arguments ? argumentsLike(original.arguments) : z.null(),
      }),
    ),
  });
}

type Translated = z.infer<ReturnType<typeof outputIn>>['translations'][number];

/** What the translator sends to the Messages API. */
export type TranslationRequest = Parameters<Anthropic['messages']['parse']>[0];

/** The part of the client the translator uses: the Messages API with structured outputs. */
export interface MessagesParser {
  parse(
    request: TranslationRequest,
  ): Promise<{ readonly stop_reason: string | null; readonly parsed_output: unknown }>;
}

function gapsIn(text: string): number {
  return text.split(GAP_MARKER).length - 1;
}

/**
 * Translates with Claude through the Messages API, in a single request for every language, so the
 * prompt is paid once and the languages agree with each other. Only the texts of the dilemma are
 * sent: no ids, no nicknames. It throws an error if the model refuses, runs out of tokens or gives
 * something that does not keep the dilemma: a language missing, other options or a gap moved.
 */
export class AnthropicTranslator implements Translator {
  readonly #messages: MessagesParser;

  constructor(messages: MessagesParser) {
    this.#messages = messages;
  }

  async translate(
    content: TranslatableContent,
    from: string,
    to: readonly string[],
  ): Promise<ReadonlyMap<string, TranslatableContent>> {
    const output = outputIn(to, content);
    const response = await this.#messages.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      output_config: { effort: 'medium', format: zodOutputFormat(output) },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            from: { code: from, language: LANGUAGE_NAMES[from] ?? from },
            to: to.map((code) => ({ code, language: LANGUAGE_NAMES[code] ?? code })),
            dilemma: {
              name: content.name,
              text: content.text,
              options: content.options,
              tags: content.tags,
              arguments: content.arguments ?? null,
            },
          }),
        },
      ],
    });
    if (response.stop_reason !== 'end_turn') {
      throw new Error(`the translator stopped with ${response.stop_reason}`);
    }
    const { translations } = output.parse(response.parsed_output);

    const translated = new Map<string, TranslatableContent>();
    for (const language of to) {
      const found = translations.filter((translation) => translation.language === language);
      if (found.length !== 1) {
        throw new Error(`the translator gave ${found.length} translations into ${language}`);
      }
      translated.set(language, this.#checked(content, found[0]!, language));
    }
    return translated;
  }

  /** The translation into one language, if it keeps the options, the gap and the arguments of the original. */
  #checked(
    original: TranslatableContent,
    translation: Translated,
    language: string,
  ): TranslatableContent {
    if (translation.options.length !== original.options.length) {
      throw new Error(
        `the translation into ${language} has ${translation.options.length} options, not ${original.options.length}`,
      );
    }
    const fields: [string, string, string][] = [
      ['name', original.name, translation.name],
      ['text', original.text, translation.text],
      ...original.options.map((option, index): [string, string, string] => [
        `option ${index + 1}`,
        option,
        translation.options[index]!,
      ]),
    ];
    const args = translation.arguments;
    if (original.arguments && args?.options.length !== original.arguments.options.length) {
      throw new Error(`the translation into ${language} has no arguments for each option`);
    }
    if (original.arguments && args) {
      fields.push(['context', original.arguments.context ?? '', args.context ?? '']);
      original.arguments.options.forEach((option, index) => {
        fields.push([`argument for option ${index + 1}`, option.for, args.options[index]!.for]);
        fields.push([
          `argument against option ${index + 1}`,
          option.against,
          args.options[index]!.against,
        ]);
      });
    }
    for (const [field, before, after] of fields) {
      if (gapsIn(before) !== gapsIn(after)) {
        throw new Error(
          `the translation into ${language} does not keep ${GAP_MARKER} in its ${field}`,
        );
      }
    }

    return {
      name: translation.name.trim(),
      text: translation.text.trim(),
      options: translation.options.map((option) => option.trim()),
      tags: translation.tags.map((tag) => tag.trim().toLowerCase()),
      ...(original.arguments &&
        args && {
          arguments: {
            ...(args.context && { context: args.context.trim() }),
            options: args.options.map((option) => ({
              for: option.for.trim(),
              against: option.against.trim(),
            })),
          },
        }),
    };
  }
}
