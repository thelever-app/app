export class InvalidReportLanguageError extends Error {
  constructor(language: string) {
    super(`"${language}" is not a language a dilemma is read in`);
    this.name = 'InvalidReportLanguageError';
  }
}
