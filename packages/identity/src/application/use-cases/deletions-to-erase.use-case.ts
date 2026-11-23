import type { DataDeletionRepository } from '../ports/data-deletion-repository.port.ts';

/**
 * The deletions the deletion job goes through, oldest first: the pending ones or, after a backup
 * is restored, every one in the log.
 */
export class DeletionsToEraseUseCase {
  readonly #deletions: DataDeletionRepository;

  constructor(deletions: DataDeletionRepository) {
    this.#deletions = deletions;
  }

  async execute({ again }: { readonly again: boolean }): Promise<string[]> {
    const deletions = again ? await this.#deletions.all() : await this.#deletions.pending();
    return deletions.map(({ id }) => id);
  }
}
