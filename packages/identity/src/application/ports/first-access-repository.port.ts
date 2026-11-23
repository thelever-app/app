import type { FirstAccess } from '../../domain/entities/first-access.ts';

/** Where the first access of each identity is kept: one per identity. */
export interface FirstAccessRepository {
  findByIdentity(identity: string): Promise<FirstAccess | undefined>;
  /** The one whose code for requests by email is this, in capitals and without groups. */
  findByRequestCode(requestCode: string): Promise<FirstAccess | undefined>;
  /**
   * Creates it the first time, and replaces it after. Two identities never share a request code:
   * the store refuses the second.
   */
  save(firstAccess: FirstAccess): Promise<void>;
  /** Nothing is left of it, its request code included. */
  delete(identity: string): Promise<void>;
}
