import type { AnalyticsObjectionRepository } from '../ports/analytics-objection-repository.port.ts';

/** A player who objected to product analytics no longer does: what they do counts again from now on. */
export class LiftAnalyticsObjectionUseCase {
  readonly #objections: AnalyticsObjectionRepository;

  constructor(objections: AnalyticsObjectionRepository) {
    this.#objections = objections;
  }

  async execute(identity: string): Promise<void> {
    await this.#objections.lift(identity);
  }
}
