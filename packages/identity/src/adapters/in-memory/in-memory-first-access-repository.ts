import type { FirstAccessRepository } from '../../application/ports/first-access-repository.port.ts';
import { FirstAccess, type FirstAccessSnapshot } from '../../domain/entities/first-access.ts';

/** Keeps the snapshots, so what it gives back is never the object that was saved. */
export class InMemoryFirstAccessRepository implements FirstAccessRepository {
  readonly #snapshots = new Map<string, FirstAccessSnapshot>();

  async findByIdentity(identity: string): Promise<FirstAccess | undefined> {
    const snapshot = this.#snapshots.get(identity);
    return snapshot && FirstAccess.fromSnapshot(snapshot);
  }

  async findByRequestCode(requestCode: string): Promise<FirstAccess | undefined> {
    const snapshot = [...this.#snapshots.values()].find((kept) => kept.requestCode === requestCode);
    return snapshot && FirstAccess.fromSnapshot(snapshot);
  }

  /**
   * A declared age stays, even if what is saved was read before it was declared; a request code
   * another identity has is refused, as the unique column refuses it in the database.
   */
  async save(firstAccess: FirstAccess): Promise<void> {
    const snapshot = firstAccess.toSnapshot();
    const owner = await this.findByRequestCode(snapshot.requestCode);
    if (owner && owner.identity !== snapshot.identity) {
      throw new Error(`the request code of ${snapshot.identity} is taken`);
    }
    const kept = this.#snapshots.get(snapshot.identity);
    const declared = kept?.birthYear !== null && kept?.birthYear !== undefined;
    this.#snapshots.set(
      snapshot.identity,
      declared ? { ...snapshot, birthYear: kept.birthYear, birthMonth: kept.birthMonth } : snapshot,
    );
  }

  async delete(identity: string): Promise<void> {
    this.#snapshots.delete(identity);
  }
}
