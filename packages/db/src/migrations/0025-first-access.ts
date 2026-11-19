import { type Kysely, sql } from 'kysely';

// The first access. Identity keeps, for each identity, the region of its device, never its
// address; the year of birth it declared and, only in a boundary year, the month; and when it last
// opened the app. Consent keeps the last version of each legal document each identity accepted,
// and when, which proves it. A player of a room keeps whether they were under 18 when they entered
// it: the players already in a room count as under 18, which is what protects them. A direct
// migration, with no expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    create table first_accesses (
      identity text primary key,
      region text not null check (region in ('eea', 'rest-of-world', 'blocked')),
      birth_year smallint check (birth_year between 1900 and 2100),
      birth_month smallint check (birth_month between 1 and 12),
      last_opened_at timestamptz not null,
      check (birth_month is null or birth_year is not null)
    )
  `.execute(db);
  await sql`
    create table legal_acceptances (
      identity text not null,
      document text not null check (document in ('terms-of-use', 'game-consent')),
      version integer not null check (version >= 0),
      accepted_at timestamptz not null,
      primary key (identity, document)
    )
  `.execute(db);
  await sql`
    alter table room_players add column under_eighteen boolean not null default true
  `.execute(db);
  await sql`alter table room_players alter column under_eighteen drop default`.execute(db);
}
