export class SameLanguageTranslationError extends Error {
  constructor(language: string) {
    super(`a translation is in another language than its original, not in "${language}"`);
    this.name = 'SameLanguageTranslationError';
  }
}
