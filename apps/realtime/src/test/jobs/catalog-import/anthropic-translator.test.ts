import { describe, expect, it } from 'vitest';
import {
  AnthropicTranslator,
  type TranslationRequest,
} from '../../../jobs/catalog-import/anthropic-translator.ts';

const CONTENT = {
  name: 'El olor',
  text: 'Si {gap} huele mal, ¿qué haces?',
  options: ['Se lo digo yo', 'No me meto'],
  tags: ['clásico'],
};

/** What the model gives for one language, unless a test changes it. */
function translationIn(language: string, overrides: Record<string, unknown> = {}) {
  return {
    language,
    name: `${language} name`,
    text: `${language}: if {gap} smells, what do you do?`,
    options: [`${language} tell`, `${language} stay out`],
    tags: [`${language}-classic`],
    arguments: null,
    ...overrides,
  };
}

/** Answers every request with that output and that stop reason, and keeps the requests. */
function modelGiving(output: unknown, stopReason = 'end_turn') {
  const requests: TranslationRequest[] = [];
  const messages = {
    parse: async (request: TranslationRequest) => {
      requests.push(request);
      return { stop_reason: stopReason, parsed_output: output };
    },
  };
  return { requests, translator: new AnthropicTranslator(messages) };
}

describe('AnthropicTranslator', () => {
  describe('translate', () => {
    it('should give the content in each language asked for', async () => {
      // Arrange
      const { translator } = modelGiving({
        translations: [translationIn('en'), translationIn('fr')],
      });

      // Act
      const translated = await translator.translate(CONTENT, 'es', ['en', 'fr']);

      // Assert
      expect(translated.get('en')).toEqual({
        name: 'en name',
        text: 'en: if {gap} smells, what do you do?',
        options: ['en tell', 'en stay out'],
        tags: ['en-classic'],
      });
      expect(translated.get('fr')?.text).toContain('fr:');
    });

    it('should ask Claude Haiku 5.5 once for every language, sending only the texts', async () => {
      // Arrange
      const { requests, translator } = modelGiving({
        translations: [translationIn('en'), translationIn('fr')],
      });

      // Act
      await translator.translate(CONTENT, 'es', ['en', 'fr']);

      // Assert
      expect(requests).toHaveLength(1);
      expect(requests[0]?.model).toBe('claude-haiku-5-5');
      const [message] = requests[0]?.messages ?? [];
      const sent = JSON.parse(String(message?.content));
      expect(sent.dilemma).toEqual({ ...CONTENT, arguments: null });
      expect(sent.to.map(({ code }: { code: string }) => code)).toEqual(['en', 'fr']);
    });

    it('should give the arguments when the content has them', async () => {
      // Arrange
      const args = {
        context: 'en context',
        options: [
          { for: 'f1', against: 'a1' },
          { for: 'f2', against: 'a2' },
        ],
      };
      const { translator } = modelGiving({
        translations: [translationIn('en', { arguments: args })],
      });

      // Act
      const translated = await translator.translate(
        {
          ...CONTENT,
          arguments: {
            context: 'contexto',
            options: [
              { for: 'F1', against: 'C1' },
              { for: 'F2', against: 'C2' },
            ],
          },
        },
        'es',
        ['en'],
      );

      // Assert
      expect(translated.get('en')?.arguments).toEqual(args);
    });

    it('should leave out a context the model gives empty', async () => {
      // Arrange
      const args = {
        context: null,
        options: [
          { for: 'f1', against: 'a1' },
          { for: 'f2', against: 'a2' },
        ],
      };
      const { translator } = modelGiving({
        translations: [translationIn('en', { arguments: args })],
      });

      // Act
      const translated = await translator.translate(
        {
          ...CONTENT,
          arguments: {
            options: [
              { for: 'F1', against: 'C1' },
              { for: 'F2', against: 'C2' },
            ],
          },
        },
        'es',
        ['en'],
      );

      // Assert
      expect(translated.get('en')?.arguments).toEqual({ options: args.options });
    });

    it.each([
      ['a language is missing', { translations: [translationIn('en')] }, 'fr'],
      [
        'a language comes twice',
        { translations: [translationIn('en'), translationIn('en'), translationIn('fr')] },
        'en',
      ],
      [
        'the options are not as many',
        { translations: [translationIn('en', { options: ['one'] }), translationIn('fr')] },
        'options',
      ],
      [
        'the gap is lost',
        { translations: [translationIn('en', { text: 'if someone smells' }), translationIn('fr')] },
        '{gap}',
      ],
    ])('should throw an error if %s', async (_case, output, named) => {
      // Arrange
      const { translator } = modelGiving(output);

      // Act & Assert
      await expect(translator.translate(CONTENT, 'es', ['en', 'fr'])).rejects.toThrow(named);
    });

    it('should keep the gap repeated or in another field, instead of a pronoun with a gender', async () => {
      // Arrange
      const { translator } = modelGiving({
        translations: [
          translationIn('en', {
            text: 'If {gap} smells, do you tell {gap}?',
            options: ['I tell {gap}', 'I stay out'],
          }),
        ],
      });

      // Act
      const translated = await translator.translate(CONTENT, 'es', ['en']);

      // Assert
      expect(translated.get('en')).toMatchObject({
        text: 'If {gap} smells, do you tell {gap}?',
        options: ['I tell {gap}', 'I stay out'],
      });
    });

    it('should throw an error if the gap appears in a dilemma that has none', async () => {
      // Arrange
      const { translator } = modelGiving({
        translations: [translationIn('en', { text: 'If someone smells', name: 'name {gap}' })],
      });

      // Act & Assert
      await expect(
        translator.translate({ ...CONTENT, text: 'Si alguien huele mal, ¿qué haces?' }, 'es', [
          'en',
        ]),
      ).rejects.toThrow('{gap}');
    });

    it('should throw an error if the name gets the gap, which the public pages show without a room', async () => {
      // Arrange
      const { translator } = modelGiving({
        translations: [translationIn('en', { name: 'The smell of {gap}' })],
      });

      // Act & Assert
      await expect(translator.translate(CONTENT, 'es', ['en'])).rejects.toThrow('name');
    });

    it('should throw an error if the gap reaches the text of a dilemma that has it only in its arguments', async () => {
      // Arrange: the game tells a dilemma with the gap by its text and its options.
      const { translator } = modelGiving({
        translations: [
          translationIn('en', {
            text: 'If {gap} smells, what do you do?',
            arguments: {
              context: 'if {gap} knows',
              options: [
                { for: 'f1', against: 'a1' },
                { for: 'f2', against: 'a2' },
              ],
            },
          }),
        ],
      });

      // Act & Assert
      await expect(
        translator.translate(
          {
            ...CONTENT,
            text: 'Si alguien huele mal, ¿qué haces?',
            arguments: {
              context: 'si {gap} lo sabe',
              options: [
                { for: 'F1', against: 'C1' },
                { for: 'F2', against: 'C2' },
              ],
            },
          },
          'es',
          ['en'],
        ),
      ).rejects.toThrow('text');
    });

    it('should throw an error if the arguments are missing or not one for each option', async () => {
      // Arrange
      const args = { context: null, options: [{ for: 'f1', against: 'a1' }] };
      const { translator } = modelGiving({
        translations: [translationIn('en', { arguments: args })],
      });

      // Act & Assert
      await expect(
        translator.translate(
          {
            ...CONTENT,
            arguments: {
              options: [
                { for: 'F1', against: 'C1' },
                { for: 'F2', against: 'C2' },
              ],
            },
          },
          'es',
          ['en'],
        ),
      ).rejects.toThrow('arguments');
    });

    it.each([
      ['drops the context of the original', { context: 'contexto' }, { context: null }],
      ['makes up a context the original has not', {}, { context: 'made up' }],
      [
        'loses the gap of an argument',
        { context: 'si {gap} lo sabe' },
        { context: 'if someone knows' },
      ],
    ])('should throw an error if the model %s', async (_case, original, given) => {
      // Arrange
      const options = [
        { for: 'f1', against: 'a1' },
        { for: 'f2', against: 'a2' },
      ];
      const { translator } = modelGiving({
        translations: [translationIn('en', { arguments: { options, ...given } })],
      });

      // Act & Assert
      await expect(
        translator.translate(
          {
            ...CONTENT,
            arguments: {
              ...original,
              options: [
                { for: 'F1', against: 'C1' },
                { for: 'F2', against: 'C2' },
              ],
            },
          },
          'es',
          ['en'],
        ),
      ).rejects.toThrow();
    });

    it('should throw an error if the model refuses or runs out of tokens', async () => {
      // Act & Assert
      await expect(
        modelGiving(null, 'refusal').translator.translate(CONTENT, 'es', ['en']),
      ).rejects.toThrow('refusal');
      await expect(
        modelGiving(null, 'max_tokens').translator.translate(CONTENT, 'es', ['en']),
      ).rejects.toThrow('max_tokens');
    });
  });
});
