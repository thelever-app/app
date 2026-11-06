import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Kysely } from 'kysely';
import { FileMigrationProvider, type MigrationResultSet, Migrator } from 'kysely/migration';

const MIGRATIONS = path.join(import.meta.dirname, 'migrations');

/**
 * Applies the migrations not applied yet, in the order of their file names, and returns their names.
 * Only forward, with no `down`: each one must also work with the revision of the server that is
 * still serving while it runs. Kysely takes a lock, so two runs at once do not clash.
 */
export async function migrateToLatest<DB>(db: Kysely<DB>): Promise<readonly string[]> {
  return namesOf(await migratorOf(db).migrateToLatest());
}

/** Applies the migrations up to that one, and no further: to test a migration on the data before it. */
export async function migrateTo<DB>(db: Kysely<DB>, migration: string): Promise<readonly string[]> {
  return namesOf(await migratorOf(db).migrateTo(migration));
}

function migratorOf<DB>(db: Kysely<DB>): Migrator {
  return new Migrator({
    db,
    provider: new FileMigrationProvider({ fs, path, migrationFolder: MIGRATIONS }),
  });
}

/** The names of the migrations applied, or what made one fail. */
function namesOf({ error, results = [] }: MigrationResultSet): readonly string[] {
  if (error) {
    const failed = results.find(({ status }) => status === 'Error');
    throw new Error(`migration ${failed?.migrationName ?? '(unknown)'} failed`, { cause: error });
  }
  return results.map(({ migrationName }) => migrationName);
}
