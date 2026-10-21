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

describe('catalogs', () => {
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
