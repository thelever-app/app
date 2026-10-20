import type { DilemmaRepository } from '../../application/ports/dilemma-repository.port.ts';
import { Dilemma, type DilemmaSnapshot } from '../../domain/entities/dilemma.ts';

/** Stores snapshots, not the dilemmas themselves, so changes that were not saved are lost like in a database. */
export class InMemoryDilemmaRepository implements DilemmaRepository {
  readonly #snapshots = new Map<string, DilemmaSnapshot>();

  async save(dilemma: Dilemma): Promise<void> {
    this.#snapshots.set(dilemma.id, dilemma.toSnapshot());
  }

  async findById(id: string): Promise<Dilemma | undefined> {
    const snapshot = this.#snapshots.get(id);
    return snapshot && Dilemma.restore(snapshot);
  }
}
