import type { DataDeletion } from '../../domain/entities/data-deletion.ts';

/** The deletion log. */
export interface DataDeletionRepository {
  /** Creates it the first time, and replaces it after. */
  save(deletion: DataDeletion): Promise<void>;
  findById(id: string): Promise<DataDeletion | undefined>;
  /** Those the deletion job has not finished, oldest first. */
  pending(): Promise<DataDeletion[]>;
  /** Every one in the log, oldest first: all of them are done again after a restore. */
  all(): Promise<DataDeletion[]>;
  /** Those of an identity, oldest first. */
  ofIdentity(identity: string): Promise<DataDeletion[]>;
}
