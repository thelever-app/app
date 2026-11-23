/**
 * @thelever-app/analytics
 *
 * The Analytics context: the product analytics, computed only on the server from facts of use tied
 * to each identity, never with votes, predictions, reactions nor which dilemmas are played; nothing
 * of who objects to it.
 */
export type {
  AnalyticsEvent,
  AnalyticsEventKind,
  AnalyticsFact,
} from './domain/entities/analytics-event.ts';
export { type VisitOrigin, visitOriginOf } from './domain/vos/visit-origin.vo.ts';
export type { Clock } from './domain/ports/clock.port.ts';
export type { IdGenerator } from './domain/ports/id-generator.port.ts';
export type { AnalyticsEventRepository } from './application/ports/analytics-event-repository.port.ts';
export type { Objections } from './application/ports/objections.port.ts';
export {
  type RecordAnalyticsEvent,
  type RecordAnalyticsEventInput,
  RecordAnalyticsEventUseCase,
} from './application/use-cases/record-analytics-event.use-case.ts';
export {
  type AnalyticsEventData,
  type EraseAnalyticsData,
  EraseAnalyticsDataUseCase,
  type ExportAnalyticsData,
  ExportAnalyticsDataUseCase,
} from './application/use-cases/analytics-personal-data.use-case.ts';
