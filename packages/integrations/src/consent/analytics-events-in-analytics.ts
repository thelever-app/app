import type { EraseAnalyticsData } from '@thelever-app/analytics/published';
import type { AnalyticsEvents } from '@thelever-app/consent';

/** The analytics events of Consent are those Analytics keeps. */
export class AnalyticsEventsInAnalytics implements AnalyticsEvents {
  readonly #erase: EraseAnalyticsData;

  constructor(erase: EraseAnalyticsData) {
    this.#erase = erase;
  }

  async erase(identity: string): Promise<void> {
    await this.#erase.execute(identity);
  }
}
