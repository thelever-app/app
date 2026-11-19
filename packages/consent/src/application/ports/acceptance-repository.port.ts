import type { Acceptances } from '../../domain/entities/acceptances.ts';

/** Where the documents each identity accepted are kept. */
export interface AcceptanceRepository {
  /** What it accepted; none accepted yet if it never accepted anything. */
  findByIdentity(identity: string): Promise<Acceptances>;
  save(acceptances: Acceptances): Promise<void>;
}
