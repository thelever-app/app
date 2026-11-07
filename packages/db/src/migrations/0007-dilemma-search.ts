import { type Kysely, sql } from 'kysely';

// The search of the catalog: a word typed matches part of the text or of a tag, or one alike
// enough to it, without minding case or accents. pg_trgm measures how alike; unaccent drops the
// accents. Both are trusted extensions: the owner of the database may create them.
// search_text is immutable, so it can back an index once the catalog needs one.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`create extension if not exists pg_trgm`.execute(db);
  await sql`create extension if not exists unaccent`.execute(db);
  await sql`
    create function search_text(text) returns text
      language sql immutable parallel safe strict
      as $$ select lower(public.unaccent('public.unaccent'::regdictionary, $1)) $$
  `.execute(db);
}
