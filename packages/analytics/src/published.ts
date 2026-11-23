/**
 * @thelever-app/analytics/published
 *
 * The published language of the Analytics context: all another context may use of it (ADR 0001).
 * Plain data and the interfaces of its commands and queries; its domain stays inside.
 */
export type { AnalyticsFact } from './domain/entities/analytics-event.ts';
export type { VisitOrigin } from './domain/vos/visit-origin.vo.ts';
export type {
  RecordAnalyticsEvent,
  RecordAnalyticsEventInput,
} from './application/use-cases/record-analytics-event.use-case.ts';
export type {
  AnalyticsEventData,
  EraseAnalyticsData,
  ExportAnalyticsData,
} from './application/use-cases/analytics-personal-data.use-case.ts';
