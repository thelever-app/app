/**
 * @thelever-app/dilemmas
 *
 * The Dilemmas bounded context: each dilemma with its immutable versions, its options, its category,
 * its tags, its minimum age and its translations, each one a dilemma of its own (ADR 0001).
 * Pure: no I/O. In-memory adapters live in `@thelever-app/dilemmas/in-memory`.
 */

// Domain
export {
  Dilemma,
  type Creator,
  type DilemmaSnapshot,
  type TranslatedContent,
  type Translation,
  type TranslationOf,
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
export { TranslationOptionCountError } from './domain/errors/translation-option-count.error.ts';
export { SameLanguageTranslationError } from './domain/errors/same-language-translation.error.ts';
export { NotAnOriginalError } from './domain/errors/not-an-original.error.ts';
export { NotItsOriginalError } from './domain/errors/not-its-original.error.ts';
export { ArgumentsDoNotMatchOptionsError } from './domain/errors/arguments-do-not-match-options.error.ts';
export type { ArgumentsSnapshot } from './domain/vos/arguments.vo.ts';

// Application
export type { DilemmaRepository } from './application/ports/dilemma-repository.port.ts';
export {
  type CandidateCriteria,
  type DilemmaCriteria,
  type DilemmaPage,
  type DilemmaQueries,
  type DilemmaSummary,
  type PageRequest,
  WORD_SIMILARITY,
} from './application/ports/dilemma-queries.port.ts';
export { DilemmaNotFoundError } from './application/errors/dilemma-not-found.error.ts';
export { InvalidPageError } from './application/errors/invalid-page.error.ts';
export {
  GetDilemmasUseCase,
  type GetDilemmasInput,
  type GetDilemmasOutput,
} from './application/use-cases/get-dilemmas.use-case.ts';
export {
  ImportCatalogUseCase,
  type ImportCatalogOutput,
} from './application/use-cases/import-catalog.use-case.ts';
export type {
  CuratedArguments,
  CuratedCatalog,
  CuratedCatalogContent,
  CuratedDilemma,
  UnreadableDilemma,
} from './application/ports/curated-catalog.port.ts';
export type { TranslatableContent, Translator } from './application/ports/translator.port.ts';
export { CatalogImportFailedError } from './application/errors/catalog-import-failed.error.ts';
export {
  SearchDilemmasUseCase,
  type SearchDilemmasInput,
  type SearchDilemmasOutput,
} from './application/use-cases/search-dilemmas.use-case.ts';
export {
  GetDilemmaPreviewUseCase,
  type GetDilemmaPreviewInput,
  type GetDilemmaPreviewOutput,
} from './application/use-cases/get-dilemma-preview.use-case.ts';
export {
  GetPublicCatalogUseCase,
  type GetPublicCatalogOutput,
  type PublicDilemma,
} from './application/use-cases/get-public-catalog.use-case.ts';
export {
  FindDilemmaIdsUseCase,
  type FindDilemmaIdsInput,
  type FindDilemmaIdsOutput,
} from './application/use-cases/find-dilemma-ids.use-case.ts';
