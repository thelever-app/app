export class InvalidLanguageError extends Error {
  constructor(language: string) {
    super(`"${language}" is not a language code`);
    this.name = 'InvalidLanguageError';
  }
}
