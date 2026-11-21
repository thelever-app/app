import { afterEach, describe, expect, it } from 'vitest';
import {
  chosenLanguage,
  chooseLanguage,
  startingLanguage,
} from '../../src/i18n/language-preference.ts';

describe('language preference', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should keep on the device the language the player chose', () => {
    // Arrange
    chooseLanguage('en');

    // Act: the app opens again.
    const language = chosenLanguage();

    // Assert
    expect(language).toBe('en');
  });

  it('should start in the language the player chose, before the one of the link', () => {
    // Arrange
    chooseLanguage('fr');

    // Act & Assert
    expect(startingLanguage('?lang=en')).toBe('fr');
  });

  it('should start in the language of the link while the player never chose one', () => {
    // Act & Assert
    expect(startingLanguage('?lang=en')).toBe('en');
  });

  it('should leave the language to the device without a choice or a link', () => {
    // Act & Assert
    expect(startingLanguage('')).toBeUndefined();
  });

  it('should open in the language of the link, and choose without failing, where the browser blocks the storage', () => {
    // Arrange
    const blocked = () => {
      throw new DOMException('The storage is blocked', 'SecurityError');
    };

    // Act
    chooseLanguage('fr', blocked);

    // Assert
    expect(startingLanguage('?lang=en', blocked)).toBe('en');
  });

  it('should ignore a kept language the app does not have', () => {
    // Arrange
    localStorage.setItem('thelever.language', 'xx');

    // Act & Assert
    expect(chosenLanguage()).toBeUndefined();
  });
});
