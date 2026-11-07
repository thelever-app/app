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
export { DilemmaNotFoundError } from './application/errors/dilemma-not-found.error.ts';
