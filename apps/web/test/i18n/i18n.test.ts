import { afterEach, describe, expect, it, vi } from 'vitest';
import { createI18n, deviceLanguage, languageOfTheLink } from '../../src/i18n/i18n.ts';

function deviceLanguages(languages: string[]) {
  vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(languages);
  vi.spyOn(window.navigator, 'language', 'get').mockReturnValue(languages[0]!);
}

describe('createI18n', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should use the plural form of the language and format the number', async () => {
    // Act
    const i18n = await createI18n('es');

    // Assert
    expect(i18n.t('playerList.pending', { count: 1 })).toBe('Falta por responder · 1');
    expect(i18n.t('playerList.pending', { count: 3 })).toBe('Faltan por responder · 3');
    expect(i18n.t('playerList.pending', { count: 1_000_000 })).toBe(
      'Faltan por responder · 1.000.000',
    );
  });

  it('should fall back to Spanish for a language the app does not have', async () => {
    // Act
    const i18n = await createI18n('ja');

    // Assert
    expect(i18n.t('playerList.you', { name: 'Ana' })).toBe('Ana (tú)');
  });

  it('should take the language of the device and tell the page which one it reads', async () => {
    // Arrange
    deviceLanguages(['pt-BR', 'en']);

    // Act
    const i18n = await createI18n();

    // Assert
    expect(i18n.language).toBe('pt-BR');
    expect(i18n.resolvedLanguage).toBe('pt');
    expect(document.documentElement.lang).toBe('pt');
  });

  it('should store nothing on the device when it detects the language', async () => {
    // Arrange
    deviceLanguages(['ca-ES']);

    // Act
    await createI18n();

    // Assert
    expect(localStorage.length).toBe(0);
  });

  it('should fall back to Spanish when the device language is not supported', async () => {
    // Arrange
    deviceLanguages(['ja']);

    // Act
    const i18n = await createI18n();

    // Assert
    expect(i18n.t('playerList.you', { name: 'Ana' })).toBe('Ana (tú)');
  });
});

describe('deviceLanguage', () => {
  it('should be the language of the device even without a catalog for its interface', async () => {
    // Arrange
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['en-US']);

    // Act
    const language = deviceLanguage(await createI18n());

    // Assert
    expect(language).toBe('en');
    vi.restoreAllMocks();
  });

  it('should be the source language for one a room cannot play in', () => {
    // Act & Assert
    expect(deviceLanguage({ language: 'ja-JP' })).toBe('es');
  });
});

describe('languageOfTheLink', () => {
  it('should take the language a link from the public web opens the app in', () => {
    // Act & Assert
    expect(languageOfTheLink('?lang=en')).toBe('en');
    expect(languageOfTheLink('?from=web&lang=ca')).toBe('ca');
  });

  it('should take none from a link without a language or with one the app does not have', () => {
    // Act & Assert
    expect(languageOfTheLink('')).toBeUndefined();
    expect(languageOfTheLink('?lang=ja')).toBeUndefined();
    expect(languageOfTheLink('?lang=')).toBeUndefined();
  });
});
