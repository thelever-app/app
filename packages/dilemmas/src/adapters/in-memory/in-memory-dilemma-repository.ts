import type { DilemmaRepository } from '../../application/ports/dilemma-repository.port.ts';
import {
  Dilemma,
  type DilemmaSnapshot,
  type VersionSnapshot,
} from '../../domain/entities/dilemma.ts';

/**
 * Stores snapshots, not the dilemmas themselves, so changes that were not saved are lost like in a database.
 * Each dilemma keeps every version it was saved at, by number.
 */
export class InMemoryDilemmaRepository implements DilemmaRepository {
  readonly #dilemmas = new Map<
    string,
    {
      readonly dilemma: Omit<DilemmaSnapshot, 'version'>;
      readonly versions: ReadonlyMap<number, VersionSnapshot>;
    }
  >();

  async save(dilemma: Dilemma): Promise<void> {
    const { version, ...rest } = dilemma.toSnapshot();
    const versions = new Map(this.#dilemmas.get(dilemma.id)?.versions);
    versions.set(version.number, version);
    this.#dilemmas.set(dilemma.id, { dilemma: rest, versions });
  }

  async findById(id: string): Promise<Dilemma | undefined> {
    const stored = this.#dilemmas.get(id);
    return stored && this.findVersion(id, Math.max(...stored.versions.keys()));
  }

  async findVersion(id: string, version: number): Promise<Dilemma | undefined> {
    const stored = this.#dilemmas.get(id);
    const snapshot = stored?.versions.get(version);
    return stored && snapshot && Dilemma.restore({ ...stored.dilemma, version: snapshot });
  }
}
