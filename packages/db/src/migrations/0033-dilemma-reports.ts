import { type Kysely, sql } from 'kysely';

// The reports players make of dilemmas, which Moderation keeps 3 years from each one:
// the version the player saw, the reason, the comment and who made it, because the report
// threshold counts different players and the decision goes back to them. A report never goes
// with its dilemma: the reference to the version deletes nothing. A direct migration, with no
// expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    create table dilemma_reports (
      id text primary key,
      dilemma_id text not null,
      version integer not null,
      reason text not null check (reason in ('offensive', 'confusing', 'mistranslated', 'other')),
      comment text check (char_length(comment) <= 280),
      identity text not null,
      reported_at timestamptz not null,
      foreign key (dilemma_id, version) references dilemma_versions (dilemma_id, number)
    )
  `.execute(db);
  await sql`
    create index dilemma_reports_by_dilemma on dilemma_reports (dilemma_id, reported_at)
  `.execute(db);
}
