import { LanguageDto } from '@thelever-app/protocol';
import { describe, expect, it } from 'vitest';
import { slug } from '../addresses.ts';
import { LANGUAGES } from '../texts/index.ts';

describe('the texts of the public web', () => {
  it('should be in each language of the app', () => {
    // Assert
    expect([...LANGUAGES.keys()]).toEqual(LanguageDto.options);
  });

  it('should give each category and page of its own an address of its own in each language', () => {
    for (const [language, texts] of LANGUAGES) {
      // Act
      const addresses = [
        ...Object.values(texts.categories).map(({ name }) => slug(name)),
        slug(texts.privacy.title),
        slug(texts.legalNotice.title),
      ];

      // Assert
      expect(new Set(addresses).size, language).toBe(addresses.length);
      expect(
        addresses.every((address) => address.length > 0),
        language,
      ).toBe(true);
    }
  });
});
