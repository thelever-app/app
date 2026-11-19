import type { FirstAccessRepository } from '../../application/ports/first-access-repository.port.ts';
import { FirstAccess, type FirstAccessSnapshot } from '../../domain/entities/first-access.ts';

/** Keeps the snapshots, so what it gives back is never the object that was saved. */
export class InMemoryFirstAccessRepository implements FirstAccessRepository {
  readonly #snapshots = new Map<string, FirstAccessSnapshot>();

  async findByIdentity(identity: string): Promise<FirstAccess | undefined> {
    const snapshot = this.#snapshots.get(identity);
    return snapshot && FirstAccess.fromSnapshot(snapshot);
  }

  /** A declared age stays, even if what is saved was read before it was declared. */
  async save(firstAccess: FirstAccess): Promise<void> {
    const snapshot = firstAccess.toSnapshot();
    const kept = this.#snapshots.get(snapshot.identity);
    const declared = kept?.birthYear !== null && kept?.birthYear !== undefined;
    this.#snapshots.set(
      snapshot.identity,
      declared ? { ...snapshot, birthYear: kept.birthYear, birthMonth: kept.birthMonth } : snapshot,
    );
  }
}
