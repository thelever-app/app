import { MINIMUM_NEW_ANSWERS } from '../../domain/vos/world-result.vo.ts';
import type { WorldResultRepository } from '../ports/world-result-repository.port.ts';

/**
 * Publishes the world result of each dilemma as it stands, which the app shows until the next
 * publication: once a day, and only for a version with MINIMUM_NEW_ANSWERS new answers since its
 * last one, so nobody can tell a vote by comparing two days. It then forgets who voted the
 * versions that are no longer current, which no longer stops anyone voting twice.
 */
export class PublishWorldResultsUseCase {
  readonly #worldResults: WorldResultRepository;

  constructor(worldResults: WorldResultRepository) {
    this.#worldResults = worldResults;
  }

  async execute(): Promise<void> {
    await this.#worldResults.publish(MINIMUM_NEW_ANSWERS);
    await this.#worldResults.forgetReceiptsOfFormerVersions();
  }
}
