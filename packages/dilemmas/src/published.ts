/**
 * @thelever-app/dilemmas/published
 *
 * The published language of the Dilemmas context: all another context may use of it (ADR 0001).
 * Plain data and the interface of its query; its domain stays inside.
 */
export {
  type GetDilemmas,
  type GetDilemmasInput,
  type GetDilemmasOutput,
} from './application/use-cases/get-dilemmas.use-case.ts';
export {
  type SearchDilemmas,
  type SearchDilemmasInput,
  type SearchDilemmasOutput,
} from './application/use-cases/search-dilemmas.use-case.ts';
export {
  type FindCandidates,
  type FindCandidatesInput,
  type FindCandidatesOutput,
} from './application/use-cases/find-candidates.use-case.ts';
export { DilemmaNotFoundError } from './application/errors/dilemma-not-found.error.ts';
export { InvalidPageError } from './application/errors/invalid-page.error.ts';
export { GAP_MARKER } from './domain/vos/gap.ts';
export type {
  ModerateDilemma,
  ModerateDilemmaInput,
  ModerationAction,
} from './application/use-cases/moderate-dilemma.use-case.ts';
export type { FindDilemmaOfReference } from './application/use-cases/find-dilemma-of-reference.use-case.ts';
export { familyOf } from './application/catalog-number.ts';
export type {
  DilemmasData,
  EraseDilemmasData,
  ExportDilemmasData,
} from './application/use-cases/dilemmas-personal-data.use-case.ts';
