import type { AcceptanceRepository } from '../../application/ports/acceptance-repository.port.ts';
import { Acceptances, type AcceptancesSnapshot } from '../../domain/entities/acceptances.ts';

/** Keeps the snapshots, so what it gives back is never the object that was saved. */
export class InMemoryAcceptanceRepository implements AcceptanceRepository {
  readonly #snapshots = new Map<string, AcceptancesSnapshot>();

  async findByIdentity(identity: string): Promise<Acceptances> {
    const snapshot = this.#snapshots.get(identity);
    return snapshot ? Acceptances.fromSnapshot(snapshot) : Acceptances.none(identity);
  }

  /** A document never goes back to a version before the one kept, even from what was read before. */
  async save(acceptances: Acceptances): Promise<void> {
    const { identity, accepted } = acceptances.toSnapshot();
    const kept = this.#snapshots.get(identity)?.accepted ?? [];
    const latest = new Map(kept.map((acceptance) => [acceptance.document, acceptance]));
    for (const acceptance of accepted) {
      const before = latest.get(acceptance.document);
      if (!before || before.version <= acceptance.version) {
        latest.set(acceptance.document, acceptance);
      }
    }
    this.#snapshots.set(identity, { identity, accepted: [...latest.values()] });
  }
}
