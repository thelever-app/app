import type { AcceptanceRepository } from '../../application/ports/acceptance-repository.port.ts';
import { Acceptances, type AcceptancesSnapshot } from '../../domain/entities/acceptances.ts';

/** Keeps the snapshots, so what it gives back is never the object that was saved. */
export class InMemoryAcceptanceRepository implements AcceptanceRepository {
  readonly #snapshots = new Map<string, AcceptancesSnapshot>();

  async findByIdentity(identity: string): Promise<Acceptances> {
    const snapshot = this.#snapshots.get(identity);
    return snapshot ? Acceptances.fromSnapshot(snapshot) : Acceptances.none(identity);
  }

  /**
   * A document never goes back to a version before the one kept, even from what was read before;
   * nor does a withdrawal go back, unless the document is given again after it.
   */
  async save(acceptances: Acceptances): Promise<void> {
    const { identity, accepted } = acceptances.toSnapshot();
    const kept = this.#snapshots.get(identity)?.accepted ?? [];
    const latest = new Map(kept.map((acceptance) => [acceptance.document, acceptance]));
    for (const acceptance of accepted) {
      const before = latest.get(acceptance.document);
      if (!before || before.version <= acceptance.version) {
        const keepsWithdrawal =
          before?.withdrawnAt && acceptance.acceptedAt.getTime() <= before.acceptedAt.getTime();
        latest.set(
          acceptance.document,
          keepsWithdrawal ? { ...acceptance, withdrawnAt: before.withdrawnAt } : acceptance,
        );
      }
    }
    this.#snapshots.set(identity, { identity, accepted: [...latest.values()] });
  }
}
