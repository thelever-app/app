import { Dilemma, type IdGenerator } from '@thelever-app/dilemmas';
import { describeWorldResultRepositoryContract } from '@thelever-app/dilemmas/contracts';
import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';
import type { Database } from '../../schema.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { PostgresDilemmaRepository } from '../postgres-dilemma-repository.ts';
import { PostgresWorldResultRepository } from '../postgres-world-result-repository.ts';

const database = useTestDatabase<Database>();

/** Hands out those ids, one after the other. */
function idsOf(...ids: string[]): IdGenerator {
  return { generate: () => ids.shift() ?? 'TestUnexpectedId' };
}

/** The dilemma TestDilemmaId, at a version 1 and a version 2 of two options each, as the contract needs. */
async function saveTheDilemmaOfTheContract(): Promise<void> {
  const dilemma = Dilemma.create(
    {
      text: 'TestText',
      language: 'es',
      options: ['TestOptionA', 'TestOptionB'],
      category: 'honesty',
      tags: [],
      minimumAge: 16,
      type: 'standard',
      compromising: false,
      scale: 'everyday',
      fixedOrder: false,
    },
    idsOf('TestDilemmaId', 'TestOptionA', 'TestOptionB', 'TestPublicId'),
  );
  const repository = new PostgresDilemmaRepository(database.db());
  await repository.save(dilemma);
  dilemma.revise(
    {
      text: 'TestRevisedText',
      options: dilemma.options.map(({ id, text }) => ({ id, text })),
      category: 'honesty',
      tags: [],
      minimumAge: 16,
      type: 'standard',
      compromising: false,
      scale: 'everyday',
      fixedOrder: false,
    },
    idsOf(),
  );
  await repository.save(dilemma);
}

describeWorldResultRepositoryContract('PostgresWorldResultRepository', async () => {
  await emptyTables(database.db());
  await saveTheDilemmaOfTheContract();
  return new PostgresWorldResultRepository(database.db());
});

describe('the tables of the world result', () => {
  it('should keep in a receipt only who voted which version, never the option or the time', async () => {
    // Act
    const { rows } = await sql<{ column_name: string }>`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'world_vote_receipts'
      order by ordinal_position
    `.execute(database.db());

    // Assert
    expect(rows.map(({ column_name }) => column_name)).toEqual([
      'identity',
      'dilemma_id',
      'version',
    ]);
  });
});
