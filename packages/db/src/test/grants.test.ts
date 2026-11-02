import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';
import { grantRowAccess } from '../grants.ts';
import type { Database } from '../schema.ts';
import { useTestDatabase } from './support/test-database.ts';

/** A role of the whole server, as the IAM user of the room server is in Cloud SQL. */
const APP_USER = 'thelever_test_app_user';

const database = useTestDatabase<Database>();

async function privilegeOf(table: string, privilege: string): Promise<boolean | undefined> {
  const { rows } = await sql<{
    granted: boolean;
  }>`select has_table_privilege(${APP_USER}, ${table}, ${privilege}) as granted`.execute(
    database.db(),
  );
  return rows[0]?.granted;
}

describe('grantRowAccess', () => {
  it('should let the user read and write the rows of the tables of the app, and nothing else', async () => {
    // Arrange
    await sql`
      do $$ begin
        if not exists (select from pg_roles where rolname = 'thelever_test_app_user') then
          create role thelever_test_app_user;
        end if;
      end $$
    `.execute(database.db());

    // Act
    await grantRowAccess(database.db(), APP_USER);

    // Assert
    for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
      expect(await privilegeOf('rooms', privilege)).toBe(true);
      expect(await privilegeOf('dilemma_versions', privilege)).toBe(true);
    }
    expect(await privilegeOf('rooms', 'TRUNCATE')).toBe(false);
    expect(await privilegeOf('kysely_migration', 'SELECT')).toBe(false);
    const { rows } = await sql<{
      create: boolean;
    }>`select has_schema_privilege(${APP_USER}, 'public', 'CREATE') as create`.execute(
      database.db(),
    );
    expect(rows[0]?.create).toBe(false);
  });
});
