import { type Kysely, sql } from 'kysely';

// The indexes of the lists of dilemmas, now that the catalog has over a thousand in each language:
// a game and a search narrow down by language, status, age and category, and a text is looked
// for with `ilike` and `<%` in the text and the tags, which the trigram indexes answer.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`create index dilemmas_by_language on dilemmas (language, visibility)`.execute(db);
  await sql`
    create index dilemma_versions_by_status
      on dilemma_versions (status, minimum_age, category)
  `.execute(db);
  await sql`
    create index dilemma_versions_by_text
      on dilemma_versions using gin (search_text(text) gin_trgm_ops)
  `.execute(db);
  await sql`
    create index dilemma_version_tags_by_tag
      on dilemma_version_tags using gin (search_text(tag) gin_trgm_ops)
  `.execute(db);
}
