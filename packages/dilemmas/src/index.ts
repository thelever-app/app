/**
 * @thelever-app/dilemmas
 *
 * The Dilemmas bounded context: the content of each dilemma, its options and its language (ADR 0001).
 * Versions, translations, the catalog by category and authoring arrive with their stories.
 * Pure: no I/O. In-memory adapters live in `@thelever-app/dilemmas/in-memory`.
 */

// Domain
export {
  Dilemma,
  type DilemmaContent,
  type DilemmaSnapshot,
  type OptionSnapshot,
} from './domain/entities/dilemma.ts';
export type { IdGenerator } from './domain/ports/id-generator.port.ts';
export { MissingArgumentError } from './domain/errors/missing-argument.error.ts';
export { IdMissingError } from './domain/errors/id-missing.error.ts';
export { TextMissingError } from './domain/errors/text-missing.error.ts';
export { InvalidLanguageError } from './domain/errors/invalid-language.error.ts';
export { OptionCountError } from './domain/errors/option-count.error.ts';
export { DuplicateOptionError } from './domain/errors/duplicate-option.error.ts';

// Application
export type { DilemmaRepository } from './application/ports/dilemma-repository.port.ts';
export { DilemmaNotFoundError } from './application/errors/dilemma-not-found.error.ts';
export {
  GetDilemmasUseCase,
  type GetDilemmasInput,
  type GetDilemmasOutput,
} from './application/use-cases/get-dilemmas.use-case.ts';
