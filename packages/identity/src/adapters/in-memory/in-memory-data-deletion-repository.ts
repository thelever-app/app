import type { DataDeletionRepository } from '../../application/ports/data-deletion-repository.port.ts';
import { DataDeletion, type DataDeletionSnapshot } from '../../domain/entities/data-deletion.ts';

/** Keeps the snapshots in the order they were requested. */
export class InMemoryDataDeletionRepository implements DataDeletionRepository {
  readonly #snapshots = new Map<string, DataDeletionSnapshot>();

  async save(deletion: DataDeletion): Promise<void> {
    this.#snapshots.set(deletion.id, deletion.toSnapshot());
  }

  async findById(id: string): Promise<DataDeletion | undefined> {
    const snapshot = this.#snapshots.get(id);
    return snapshot && DataDeletion.fromSnapshot(snapshot);
  }

  async pending(): Promise<DataDeletion[]> {
    return this.#oldestFirst()
      .filter(({ erasedAt }) => erasedAt === null)
      .map(DataDeletion.fromSnapshot);
  }

  async all(): Promise<DataDeletion[]> {
    return this.#oldestFirst().map(DataDeletion.fromSnapshot);
  }

  async ofIdentity(identity: string): Promise<DataDeletion[]> {
    return this.#oldestFirst()
      .filter((snapshot) => snapshot.identity === identity)
      .map(DataDeletion.fromSnapshot);
  }

  #oldestFirst(): DataDeletionSnapshot[] {
    return [...this.#snapshots.values()].sort(
      (a, b) => a.requestedAt.getTime() - b.requestedAt.getTime(),
    );
  }
}
