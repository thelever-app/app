import type { Objections } from '@thelever-app/analytics';
import type { ObjectsToAnalytics } from '@thelever-app/consent/published';

/** Who objects to product analytics, as Consent keeps it. */
export class ObjectionsInConsent implements Objections {
  readonly #objectsToAnalytics: ObjectsToAnalytics;

  constructor(objectsToAnalytics: ObjectsToAnalytics) {
    this.#objectsToAnalytics = objectsToAnalytics;
  }

  async objects(identity: string): Promise<boolean> {
    return this.#objectsToAnalytics.execute(identity);
  }
}
