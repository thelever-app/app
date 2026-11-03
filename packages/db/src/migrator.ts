import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Kysely } from 'kysely';
import { FileMigrationProvider, Migrator } from 'kysely/migration';

const MIGRATIONS = path.join(import.meta.dirname, 'migrations');

/**
 * Applies the migrations not applied yet, in the order of their file names, and returns their names.
 * Only forward, with no `down`: each one must also work with the revision of the server that is
 * still serving while it runs. Kysely takes a lock, so two runs at once do not clash.
 */
export async function migrateToLatest<DB>(db: Kysely<DB>): Promise<readonly string[]> {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({ fs, path, migrationFolder: MIGRATIONS }),
  });
  const { error, results = [] } = await migrator.migrateToLatest();
  if (error) {
    const failed = results.find(({ status }) => status === 'Error');
    throw new Error(`migration ${failed?.migrationName ?? '(unknown)'} failed`, { cause: error });
  }
  return results.map(({ migrationName }) => migrationName);
}
