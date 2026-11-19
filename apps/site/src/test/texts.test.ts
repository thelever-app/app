import { LanguageDto } from '@thelever-app/protocol';
import { describe, expect, it } from 'vitest';
import { pagePath, slug } from '../addresses.ts';
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
        slug(texts.cookies.title),
        slug(texts.legalNotice.title),
        slug(texts.terms.title),
        slug(texts.appPrivacy.title),
      ];

      // Assert
      expect(new Set(addresses).size, language).toBe(addresses.length);
      expect(
        addresses.every((address) => address.length > 0),
        language,
      ).toBe(true);
    }
  });

  it('should publish the terms and the privacy policy of the app where the app links to them', () => {
    // Arrange: the addresses of apps/web/src/first-access/legal-links.ts.
    const linked = {
      es: ['/es/condiciones-de-uso', '/es/privacidad-de-la-app'],
      en: ['/en/terms-of-use', '/en/app-privacy'],
      fr: ['/fr/conditions-d-utilisation', '/fr/confidentialite-de-l-app'],
      de: ['/de/nutzungsbedingungen', '/de/datenschutz-der-app'],
      it: ['/it/condizioni-d-uso', '/it/privacy-dell-app'],
      pt: ['/pt/condicoes-de-utilizacao', '/pt/privacidade-da-app'],
      ca: ['/ca/condicions-d-us', '/ca/privadesa-de-l-app'],
    };

    for (const [language, texts] of LANGUAGES) {
      // Act
      const published = [
        pagePath(language, texts.terms.title),
        pagePath(language, texts.appPrivacy.title),
      ];

      // Assert
      expect(published, language).toEqual(linked[language as keyof typeof linked]);
    }
  });
});
