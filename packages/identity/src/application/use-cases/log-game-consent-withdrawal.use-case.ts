import { DataDeletion } from '../../domain/entities/data-deletion.ts';
import type { Clock } from '../../domain/ports/clock.port.ts';
import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import type { DataDeletionRepository } from '../ports/data-deletion-repository.port.ts';

/** Withdrawing the game consent deleted the game data of an identity at once: what the log keeps of it. */
export interface LogGameConsentWithdrawal {
  execute(identity: string): Promise<void>;
}

/**
 * Keeps in the deletion log that withdrawing the game consent deleted the game data of an
 * identity, already done, so that it is done again after a backup is restored.
 */
export class LogGameConsentWithdrawalUseCase implements LogGameConsentWithdrawal {
  readonly #deletions: DataDeletionRepository;
  readonly #ids: IdGenerator;
  readonly #clock: Clock;

  constructor(deletions: DataDeletionRepository, ids: IdGenerator, clock: Clock) {
    this.#deletions = deletions;
    this.#ids = ids;
    this.#clock = clock;
  }

  async execute(identity: string): Promise<void> {
    const now = this.#clock.now();
    const deletion = DataDeletion.request({
      id: this.#ids.generate(),
      identity,
      reason: 'game-consent-withdrawn',
      now,
    });
    deletion.erased(now);
    await this.#deletions.save(deletion);
  }
}
