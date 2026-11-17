import type { WorldResultRepository } from '../ports/world-result-repository.port.ts';

/**
 * Publishes the world result of every dilemma as it stands, which the app shows until the next
 * publication: once a day, so nobody can tell a vote from the next one by watching the counts.
 */
export class PublishWorldResultsUseCase {
  readonly #worldResults: WorldResultRepository;

  constructor(worldResults: WorldResultRepository) {
    this.#worldResults = worldResults;
  }

  async execute(): Promise<void> {
    await this.#worldResults.publish();
  }
}
