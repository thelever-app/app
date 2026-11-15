import type { Dilemma } from '@thelever-app/dilemmas';
import { type Kysely, sql } from 'kysely';

/**
 * Saves the dilemma with the columns of the first migration, as the tests of a later migration
 * need it before that one runs: the repository writes the schema of today, which they have not got.
 */
export async function insertDilemmaAsTheFirstMigrationLeftIt<DB>(
  db: Kysely<DB>,
  dilemma: Dilemma,
): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await sql`
      insert into dilemmas (id, language, creator_type, visibility)
      values (${dilemma.id}, ${dilemma.language}, 'curation-team', ${dilemma.visibility})
    `.execute(trx);
    await sql`
      insert into dilemma_versions (dilemma_id, number, text, category, minimum_age, status)
      values (${dilemma.id}, ${dilemma.version}, ${dilemma.text}, ${dilemma.category},
        ${dilemma.minimumAge}, ${dilemma.status})
    `.execute(trx);
    for (const [position, option] of dilemma.options.entries()) {
      await sql`
        insert into dilemma_version_options (dilemma_id, version, position, option_id, text)
        values (${dilemma.id}, ${dilemma.version}, ${position}, ${option.id}, ${option.text})
      `.execute(trx);
    }
    for (const [position, tag] of dilemma.tags.entries()) {
      await sql`
        insert into dilemma_version_tags (dilemma_id, version, position, tag)
        values (${dilemma.id}, ${dilemma.version}, ${position}, ${tag})
      `.execute(trx);
    }
  });
}
