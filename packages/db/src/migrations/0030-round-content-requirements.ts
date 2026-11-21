import { type Kysely, sql } from 'kysely';

// The content of a random round becomes the requirements its dilemma must meet, any of which may
// be marked, both too: none is any content, and the one each round had becomes its only one. A
// direct migration, with no expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`alter table room_rounds drop constraint room_rounds_content_check`.execute(db);
  await sql`
    alter table room_rounds alter column content type text[] using (
      case when content = 'any' then '{}'::text[] when content is not null then array[content] end
    )
  `.execute(db);
  await sql`
    alter table room_rounds add constraint room_rounds_content
      check (content <@ array['adults-only', 'compromising']::text[])
  `.execute(db);
}
