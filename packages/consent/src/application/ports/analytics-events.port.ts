/** The analytics events of an identity, which objecting to product analytics deletes. */
export interface AnalyticsEvents {
  erase(identity: string): Promise<void>;
}
