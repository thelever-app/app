import type { FirstAccessRepository } from '../../application/ports/first-access-repository.port.ts';
import { FirstAccess, type FirstAccessSnapshot } from '../../domain/entities/first-access.ts';

/** Keeps the snapshots, so what it gives back is never the object that was saved. */
export class InMemoryFirstAccessRepository implements FirstAccessRepository {
  readonly #snapshots = new Map<string, FirstAccessSnapshot>();

  async findByIdentity(identity: string): Promise<FirstAccess | undefined> {
    const snapshot = this.#snapshots.get(identity);
    return snapshot && FirstAccess.fromSnapshot(snapshot);
  }

  async save(firstAccess: FirstAccess): Promise<void> {
    this.#snapshots.set(firstAccess.identity, firstAccess.toSnapshot());
  }
}
