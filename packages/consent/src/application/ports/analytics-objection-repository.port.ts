/** Who objected to product analytics, and since when: one at most per identity. */
export interface AnalyticsObjectionRepository {
  objectedAt(identity: string): Promise<Date | undefined>;
  /** Keeps the first time, if they had already objected. */
  object(identity: string, at: Date): Promise<void>;
  lift(identity: string): Promise<void>;
}
