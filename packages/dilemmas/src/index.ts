/**
 * @thelever-app/dilemmas
 *
 * The Dilemmas bounded context: each dilemma with its immutable versions, its options, its category,
 * its tags and its minimum age (ADR 0001). Translations, the catalog and authoring arrive with their stories.
 * Pure: no I/O. In-memory adapters live in `@thelever-app/dilemmas/in-memory`.
 */

// Domain
export {
  Dilemma,
  type Creator,
  type DilemmaContent,
  type DilemmaSnapshot,
  type DilemmaStatus,
  type OptionSnapshot,
  type VersionSnapshot,
  type Visibility,
} from './domain/entities/dilemma.ts';
export { CATEGORIES, type Category } from './domain/vos/category.vo.ts';
export { MINIMUM_AGES, type MinimumAge } from './domain/vos/minimum-age.vo.ts';
export type { IdGenerator } from './domain/ports/id-generator.port.ts';
export { MissingArgumentError } from './domain/errors/missing-argument.error.ts';
export { IdMissingError } from './domain/errors/id-missing.error.ts';
export { TextMissingError } from './domain/errors/text-missing.error.ts';
export { InvalidLanguageError } from './domain/errors/invalid-language.error.ts';
export { OptionCountError } from './domain/errors/option-count.error.ts';
export { DuplicateOptionError } from './domain/errors/duplicate-option.error.ts';
export { UnknownOptionError } from './domain/errors/unknown-option.error.ts';
export { UnknownCategoryError } from './domain/errors/unknown-category.error.ts';
export { TagMissingError } from './domain/errors/tag-missing.error.ts';
export { TagTooLongError } from './domain/errors/tag-too-long.error.ts';
export { TagCountError } from './domain/errors/tag-count.error.ts';
export { DuplicateTagError } from './domain/errors/duplicate-tag.error.ts';
export { InvalidMinimumAgeError } from './domain/errors/invalid-minimum-age.error.ts';

// Application
export type {
  DilemmaRepository,
  DilemmaCriteria,
} from './application/ports/dilemma-repository.port.ts';
export { DilemmaNotFoundError } from './application/errors/dilemma-not-found.error.ts';
export {
  GetDilemmasUseCase,
  type GetDilemmasInput,
  type GetDilemmasOutput,
} from './application/use-cases/get-dilemmas.use-case.ts';
export {
  SearchDilemmasUseCase,
  type SearchDilemmasInput,
  type SearchDilemmasOutput,
} from './application/use-cases/search-dilemmas.use-case.ts';
