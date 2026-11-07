import type { Dilemma, DilemmaStatus } from '../../domain/entities/dilemma.ts';
import type { MinimumAge } from '../../domain/vos/minimum-age.vo.ts';

/** Which public dilemmas to look for, at their current version; every criterion given must hold. */
export interface DilemmaCriteria {
  readonly dilemmaIds?: readonly string[];
  /** Any of them; none, every category. */
  readonly categories?: readonly string[];
  /** 16 leaves out the dilemmas for adults. */
  readonly maximumMinimumAge: MinimumAge;
  readonly status: DilemmaStatus;
}

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
  /** The public dilemmas that match, at their current version, ordered by id; none is an empty list. */
  search(criteria: DilemmaCriteria): Promise<Dilemma[]>;
}
