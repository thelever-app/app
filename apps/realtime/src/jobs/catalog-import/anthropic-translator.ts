import type Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { TranslatableContent, Translator } from '@thelever-app/dilemmas';
import { GAP_MARKER } from '@thelever-app/dilemmas/published';
import { z } from 'zod';

/** The cheapest model that keeps a dilemma intact, chosen by Mario on 15 November. */
const MODEL = 'claude-haiku-5-5';
/**
 * One language of a dilemma with four options and long arguments, with what the model thinks
 * first, took up to 4,400 tokens.
 */
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

Translate the dilemma you are given into the language asked for, so that a native speaker reads it as if it had been written in their language:
- Keep the moral conflict exactly as it is: the same facts, the same stakes, the same people involved. Do not soften, sharpen, explain or add anything.
- Keep the options as many and in the same order. Option n of the translation translates option n of the original, and each option stays as short as it is.
- The text ${GAP_MARKER} stands for the nickname of a player of the room. Keep it, as it is, in each field where the original has it, write the sentence so it reads well with any name in its place, and never add it to a dilemma that does not have it.
- Nobody knows the gender of that player nor of the reader, the "you" of the dilemma: never give either of them one. Where the language would need a gendered pronoun, article, adjective or participle for them, rephrase with a neutral construction or, for the player, repeat ${GAP_MARKER} instead of the pronoun ("they" is fine in English). Check every adjective and participle about the reader: "tu t'es trompé", "toi seul", "t'has equivocat" and "ti sei sbagliato" give a gender; "tu as eu tort", "tu es la seule personne à", "t'has errat" and "hai sbagliato" do not. Never put an article before ${GAP_MARKER} ("ao ${GAP_MARKER}", "al ${GAP_MARKER}"): write "a ${GAP_MARKER}". Repeat ${GAP_MARKER} only where a neutral wording does not read well. Keep the gender of the other people as the original gives it.
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

/** What the model gives: the translation, with arguments exactly when the original has them, so the model cannot leave them out. */
function outputLike(original: TranslatableContent) {
  return z.object({
    name: z.string(),
    text: z.string(),
    options: z.array(z.string()),
    tags: z.array(z.string()),
    arguments: original.arguments ? argumentsLike(original.arguments) : z.null(),
  });
}

type Translated = z.infer<ReturnType<typeof outputLike>>;

/** What the translator sends to the Messages API. */
export type TranslationRequest = Parameters<Anthropic['messages']['parse']>[0];

/** The part of the client the translator uses: the Messages API with structured outputs. */
export interface MessagesParser {
  parse(
    request: TranslationRequest,
  ): Promise<{ readonly stop_reason: string | null; readonly parsed_output: unknown }>;
}

function hasTheGap(text: string): boolean {
  return text.includes(GAP_MARKER);
}

/**
 * Translates with Claude through the Messages API, one request per language, all at once: a
 * single request for every language did not fit in its tokens with the longest dilemmas. Only the
 * texts of the dilemma are sent: no ids, no nicknames. It throws an error if the model refuses,
 * runs out of tokens or gives something that does not keep the dilemma: other options or a gap
 * lost.
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
    const translations = await Promise.all(
      to.map(
        async (language) => [language, await this.#translateInto(content, from, language)] as const,
      ),
    );
    return new Map(translations);
  }

  async #translateInto(
    content: TranslatableContent,
    from: string,
    language: string,
  ): Promise<TranslatableContent> {
    const output = outputLike(content);
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
            to: { code: language, language: LANGUAGE_NAMES[language] ?? language },
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
      throw new Error(`the translator stopped with ${response.stop_reason} in ${language}`);
    }
    return this.#checked(content, output.parse(response.parsed_output), language);
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
    // The gap may come more often, or in another field, where a pronoun would give the player a
    // gender: the nickname fills each one. It must stay where it was; a dilemma without it, as the
    // game tells by its text and its options, must not get it, and neither may the name, which the
    // public pages show without a room.
    const hasGap = [original.text, ...original.options].some(hasTheGap);
    for (const [field, before, after] of fields) {
      if (hasTheGap(before) && !hasTheGap(after)) {
        throw new Error(
          `the translation into ${language} does not keep ${GAP_MARKER} in its ${field}`,
        );
      }
      if (hasTheGap(after) && !hasTheGap(before) && (!hasGap || field === 'name')) {
        throw new Error(
          `the translation into ${language} adds ${GAP_MARKER} to its ${field}, which the dilemma has not`,
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
