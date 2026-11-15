export class TranslationOptionCountError extends Error {
  constructor(expected: number, actual: number) {
    super(`a translation has as many options as its original, ${expected}, not ${actual}`);
    this.name = 'TranslationOptionCountError';
  }
}
