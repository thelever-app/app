import type { Dilemma } from '../../domain/entities/dilemma.ts';

export interface DilemmaRepository {
  /**
   * Adds the current version if it is new and keeps the status and the visibility;
   * the content of a version already saved never changes.
   */
  save(dilemma: Dilemma): Promise<void>;
  /** The dilemma at its current version. */
  findById(id: string): Promise<Dilemma | undefined>;
  /** The dilemma as it was at that version, to read what was played; never to revise it. */
  findVersion(id: string, version: number): Promise<Dilemma | undefined>;
}
