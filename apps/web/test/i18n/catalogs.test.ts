import { describe, expect, it } from 'vitest';
import { SOURCE_LANGUAGE, SUPPORTED_LANGUAGES } from '../../src/i18n/i18n.ts';

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const catalogs = import.meta.glob<object>('../../src/i18n/locales/*.json', {
  eager: true,
  import: 'default',
});

function keysOf(catalog: object, prefix = ''): string[] {
  return Object.entries(catalog).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? keysOf(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

function languageOf(path: string): string {
  return path.match(/([\w-]+)\.json$/)![1]!;
}

/** The keys of the source catalog, with the plural forms the language needs. */
function expectedKeys(language: string): string[] {
  const source = keysOf(catalogs[`../../src/i18n/locales/${SOURCE_LANGUAGE}.json`]!);
  const plain = source.filter((key) => !PLURAL_SUFFIX.test(key));
  const plurals = [
    ...new Set(
      source.filter((key) => PLURAL_SUFFIX.test(key)).map((key) => key.replace(PLURAL_SUFFIX, '')),
    ),
  ];
  const categories = new Intl.PluralRules(language).resolvedOptions().pluralCategories;
  return [
    ...plain,
    ...plurals.flatMap((base) => categories.map((category) => `${base}_${category}`)),
  ].sort();
}

/** Each text of the catalog by its key, nested keys joined with dots. */
function textsOf(catalog: object, prefix = ''): [string, string][] {
  return Object.entries(catalog).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? textsOf(value, `${prefix}${key}.`)
      : [[`${prefix}${key}`, String(value)] as [string, string]],
  );
}

/** The values a text interpolates, by name, whatever their format. */
function variablesOf(text: string): string[] {
  return [...new Set([...text.matchAll(/\{\{\s*(\w+)/g)].map((match) => match[1]!))].sort();
}

describe('catalogs', () => {
  it('should exist for every supported language', () => {
    // Act
    const languages = Object.keys(catalogs).map(languageOf);

    // Assert
    expect(languages.sort()).toEqual([...SUPPORTED_LANGUAGES].sort());
  });

  it('should interpolate in each text the same values as the source', () => {
    // Arrange
    const source = new Map(
      textsOf(catalogs[`../../src/i18n/locales/${SOURCE_LANGUAGE}.json`]!).map(([key, text]) => [
        key.replace(PLURAL_SUFFIX, ''),
        variablesOf(text),
      ]),
    );

    // Act & Assert
    for (const [path, catalog] of Object.entries(catalogs)) {
      for (const [key, text] of textsOf(catalog)) {
        const base = key.replace(PLURAL_SUFFIX, '');
        const expected = (source.get(base) ?? []).filter(
          // A singular may say "one" in words instead of interpolating the count.
          (name) => name !== 'count' || !key.endsWith('_one'),
        );
        expect(
          variablesOf(text).filter((name) => name !== 'count' || !key.endsWith('_one')),
          `${languageOf(path)}: ${key}`,
        ).toEqual(expected);
      }
    }
  });

  it('should only exist for supported languages', () => {
    // Act & Assert
    for (const path of Object.keys(catalogs)) {
      expect(SUPPORTED_LANGUAGES).toContain(languageOf(path));
    }
  });

  for (const [path, catalog] of Object.entries(catalogs)) {
    it(`should have every key of the source, with the plural forms of ${languageOf(path)}`, () => {
      // Act & Assert
      expect(keysOf(catalog).sort()).toEqual(expectedKeys(languageOf(path)));
    });
  }
});
