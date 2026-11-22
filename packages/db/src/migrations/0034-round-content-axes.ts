import { type Kysely, sql } from 'kysely';

// The content of a random round becomes two columns, the age and whether compromising, each of
// them any unless asked: a round asking for adults-only dilemmas asks for that age, and one asking
// for compromising ones, for those. Null in the rounds that are not random; dropping the column
// of the requirements drops its checks. A direct migration,
// with no expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    alter table room_rounds
      add column content_age text
        check (content_age in ('any', 'from-16', 'adults-only')),
      add column content_compromising text
        check (content_compromising in ('any', 'no', 'yes'))
  `.execute(db);
  await sql`
    update room_rounds set
      content_age = case when 'adults-only' = any(content) then 'adults-only' else 'any' end,
      content_compromising = case when 'compromising' = any(content) then 'yes' else 'any' end
    where content is not null
  `.execute(db);
  await sql`
    alter table room_rounds
      drop column content,
      add constraint room_rounds_content_of_random check (
        (origin = 'random') = (content_age is not null)
        and (origin = 'random') = (content_compromising is not null)
      )
  `.execute(db);
}
