import type { AcceptanceRepository } from '../../application/ports/acceptance-repository.port.ts';
import { Acceptances, type AcceptancesSnapshot } from '../../domain/entities/acceptances.ts';

/** Keeps the snapshots, so what it gives back is never the object that was saved. */
export class InMemoryAcceptanceRepository implements AcceptanceRepository {
  readonly #snapshots = new Map<string, AcceptancesSnapshot>();

  async findByIdentity(identity: string): Promise<Acceptances> {
    const snapshot = this.#snapshots.get(identity);
    return snapshot ? Acceptances.fromSnapshot(snapshot) : Acceptances.none(identity);
  }

  async save(acceptances: Acceptances): Promise<void> {
    this.#snapshots.set(acceptances.identity, acceptances.toSnapshot());
  }
}
