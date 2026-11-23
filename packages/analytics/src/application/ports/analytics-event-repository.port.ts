import type { AnalyticsEvent, AnalyticsEventKind } from '../../domain/entities/analytics-event.ts';

/** The analytics events, by identity. */
export interface AnalyticsEventRepository {
  record(event: AnalyticsEvent): Promise<void>;
  /** Those of an identity, oldest first. */
  ofIdentity(identity: string): Promise<AnalyticsEvent[]>;
  /** Whether the identity has an event of that kind, as the first visit, which happens once. */
  has(identity: string, kind: AnalyticsEventKind): Promise<boolean>;
  erase(identity: string): Promise<void>;
}
