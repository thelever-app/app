import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';
import { grantDilemmaAccess, grantDilemmaReadAccess, grantRowAccess } from '../grants.ts';
import type { Database } from '../schema.ts';
import { useTestDatabase } from './support/test-database.ts';

/** A role of the whole server, as the IAM user of the room server is in Cloud SQL. */
const APP_USER = 'thelever_test_app_user';
/** A role of the whole server, as the IAM user of the job that loads the catalog is in Cloud SQL. */
const CATALOG_USER = 'thelever_test_catalog_user';
/** A role of the whole server, as the IAM user of the public web is in Cloud SQL. */
const SITE_USER = 'thelever_test_site_user';

const database = useTestDatabase<Database>();

async function privilegeOf(
  table: string,
  privilege: string,
  user = APP_USER,
): Promise<boolean | undefined> {
  const { rows } = await sql<{
    granted: boolean;
  }>`select has_table_privilege(${user}, ${table}, ${privilege}) as granted`.execute(database.db());
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

describe('grantDilemmaAccess', () => {
  it('should let the user read and write the rows of the tables of Dilemmas, and of nothing else', async () => {
    // Arrange
    await sql`
      do $$ begin
        if not exists (select from pg_roles where rolname = 'thelever_test_catalog_user') then
          create role thelever_test_catalog_user;
        end if;
      end $$
    `.execute(database.db());

    // Act
    await grantDilemmaAccess(database.db(), CATALOG_USER);

    // Assert
    for (const table of ['dilemmas', 'dilemma_versions', 'dilemma_version_option_arguments']) {
      for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
        expect(await privilegeOf(table, privilege, CATALOG_USER)).toBe(true);
      }
    }
    expect(await privilegeOf('rooms', 'SELECT', CATALOG_USER)).toBe(false);
    expect(await privilegeOf('game_dilemmas', 'SELECT', CATALOG_USER)).toBe(false);
    expect(await privilegeOf('room_rounds', 'SELECT', CATALOG_USER)).toBe(false);
  });
});

describe('grantDilemmaReadAccess', () => {
  it('should let the user only read the rows of the tables of Dilemmas', async () => {
    // Arrange
    await sql`
      do $$ begin
        if not exists (select from pg_roles where rolname = 'thelever_test_site_user') then
          create role thelever_test_site_user;
        end if;
      end $$
    `.execute(database.db());

    // Act
    await grantDilemmaReadAccess(database.db(), SITE_USER);

    // Assert
    for (const table of ['dilemmas', 'dilemma_versions', 'dilemma_version_option_arguments']) {
      expect(await privilegeOf(table, 'SELECT', SITE_USER)).toBe(true);
      for (const privilege of ['INSERT', 'UPDATE', 'DELETE']) {
        expect(await privilegeOf(table, privilege, SITE_USER)).toBe(false);
      }
    }
    expect(await privilegeOf('rooms', 'SELECT', SITE_USER)).toBe(false);
  });
});
