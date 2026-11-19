import type { FirstAccess } from '../../domain/entities/first-access.ts';

/** Where the first access of each identity is kept: one per identity. */
export interface FirstAccessRepository {
  findByIdentity(identity: string): Promise<FirstAccess | undefined>;
  /** Creates it the first time, and replaces it after. */
  save(firstAccess: FirstAccess): Promise<void>;
}
