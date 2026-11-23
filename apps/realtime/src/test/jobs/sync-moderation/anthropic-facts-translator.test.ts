import { describe, expect, it } from 'vitest';
import {
  AnthropicFactsTranslator,
  FactsTranslationError,
} from '../../../jobs/sync-moderation/anthropic-facts-translator.ts';

const TRANSLATED = {
  en: 'TestFacts en',
  fr: 'TestFacts fr',
  de: 'TestFacts de',
  it: 'TestFacts it',
  pt: 'TestFacts pt',
  ca: 'TestFacts ca',
};

describe('AnthropicFactsTranslator', () => {
  it('should give the facts in every language, the Spanish of the team as it is', async () => {
    // Arrange
    const requests: unknown[] = [];
    const translator = new AnthropicFactsTranslator({
      parse: async (request) => {
        requests.push(request);
        return { stop_reason: 'end_turn', parsed_output: TRANSLATED };
      },
    });

    // Act
    const facts = await translator.translate('TestHechos');

    // Assert
    expect(facts).toEqual({ es: 'TestHechos', ...TRANSLATED });
    expect(JSON.stringify(requests)).toContain('TestHechos');
  });

  it('should fail when the model stops before giving every language', async () => {
    // Arrange
    const translator = new AnthropicFactsTranslator({
      parse: async () => ({ stop_reason: 'max_tokens', parsed_output: null }),
    });

    // Act & Assert
    await expect(translator.translate('TestHechos')).rejects.toThrow(FactsTranslationError);
  });
});
