import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from './support/test-database.ts';

describe('useTestDatabase', () => {
  const database = useTestDatabase();

  it('should give the test file a database of its own', async () => {
    // Act
    const { rows } = await sql<{ name: string }>`select current_database() as name`.execute(
      database.db(),
    );

    // Assert
    expect(rows[0]?.name).toMatch(/^thelever_test_[0-9a-f]{32}$/);
    expect(database.url()).toContain(rows[0]?.name);
  });

  it('should copy it from the template, already migrated', async () => {
    // Act
    const { rows } = await sql<{
      table: string | null;
    }>`select to_regclass('kysely_migration')::text as table`.execute(database.db());

    // Assert
    expect(rows[0]?.table).toBe('kysely_migration');
  });
});
