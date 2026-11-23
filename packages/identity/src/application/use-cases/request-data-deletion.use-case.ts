import { DataDeletion } from '../../domain/entities/data-deletion.ts';
import type { Clock } from '../../domain/ports/clock.port.ts';
import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import type { DataDeletionRepository } from '../ports/data-deletion-repository.port.ts';

/**
 * A player asks for their data to be deleted, from the app or by email with their code: it goes
 * into the deletion log, and the deletion job deletes it within a day, well inside the month the
 * law gives. Asking again while it waits adds nothing.
 */
export class RequestDataDeletionUseCase {
  readonly #deletions: DataDeletionRepository;
  readonly #ids: IdGenerator;
  readonly #clock: Clock;

  constructor(deletions: DataDeletionRepository, ids: IdGenerator, clock: Clock) {
    this.#deletions = deletions;
    this.#ids = ids;
    this.#clock = clock;
  }

  async execute(identity: string): Promise<void> {
    const deletions = await this.#deletions.ofIdentity(identity);
    if (deletions.some((deletion) => deletion.reason === 'request' && deletion.isPending)) return;
    await this.#deletions.save(
      DataDeletion.request({
        id: this.#ids.generate(),
        identity,
        reason: 'request',
        now: this.#clock.now(),
      }),
    );
  }
}
