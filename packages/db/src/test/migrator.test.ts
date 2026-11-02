import { describe, expect, it } from 'vitest';
import { migrateToLatest } from '../migrator.ts';
import { useTestDatabase } from './support/test-database.ts';

describe('migrateToLatest', () => {
  const database = useTestDatabase();

  it('should apply nothing to a database that has every migration already', async () => {
    // Act
    const applied = await migrateToLatest(database.db());

    // Assert
    expect(applied).toEqual([]);
  });
});
