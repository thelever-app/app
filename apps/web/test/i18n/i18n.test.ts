import { afterEach, describe, expect, it, vi } from 'vitest';
import { createI18n } from '../../src/i18n/i18n.ts';

function deviceLanguages(languages: string[]) {
  vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(languages);
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
    expect(i18n.t('playerList.pending', { count: 1 })).toBe('Falta · 1');
    expect(i18n.t('playerList.pending', { count: 3 })).toBe('Faltan · 3');
    expect(i18n.t('playerList.pending', { count: 1_000_000 })).toBe('Faltan · 1.000.000');
  });

  it('should fall back to Spanish for a language without a catalog', async () => {
    // Act
    const i18n = await createI18n('de');

    // Assert
    expect(i18n.t('playerList.you')).toBe('Tú');
  });

  it('should take the language of the device and tell the page which one it reads', async () => {
    // Arrange
    deviceLanguages(['pt-BR', 'en']);

    // Act
    const i18n = await createI18n();

    // Assert
    expect(i18n.language).toBe('pt-BR');
    expect(i18n.resolvedLanguage).toBe('es');
    expect(document.documentElement.lang).toBe('es');
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
    expect(i18n.t('playerList.you')).toBe('Tú');
  });
});
