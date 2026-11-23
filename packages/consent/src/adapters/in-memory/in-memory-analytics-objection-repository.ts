import type { AnalyticsObjectionRepository } from '../../application/ports/analytics-objection-repository.port.ts';

export class InMemoryAnalyticsObjectionRepository implements AnalyticsObjectionRepository {
  readonly #objectedAt = new Map<string, Date>();

  async objectedAt(identity: string): Promise<Date | undefined> {
    return this.#objectedAt.get(identity);
  }

  async object(identity: string, at: Date): Promise<void> {
    if (!this.#objectedAt.has(identity)) this.#objectedAt.set(identity, at);
  }

  async lift(identity: string): Promise<void> {
    this.#objectedAt.delete(identity);
  }
}
