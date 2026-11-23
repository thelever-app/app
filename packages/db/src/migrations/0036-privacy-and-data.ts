import { randomInt } from 'node:crypto';
import { type Kysely, sql } from 'kysely';

/** Crockford's base 32, as Identity writes the codes for requests by email. */
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LENGTH = 12;

function requestCode(): string {
  return Array.from({ length: CODE_LENGTH }, () =>
    CODE_ALPHABET.charAt(randomInt(CODE_ALPHABET.length)),
  ).join('');
}

// Privacy and data: the rights of the players over their data.
//
// Identity: each first access gets its code for requests by email, unique, and the identities that
// already have one get theirs here, unguessable like the ones the app makes; and the deletion log,
// which the deletion job goes through and does again after a backup is restored.
// Consent: the game consent can be withdrawn, keeping when it was given; and who objects to product
// analytics. Analytics: the analytics events, by identity. Game: the seal of each answer, reaction
// and like keeps whether the player objects. Moderation: a report, a notice and a reported nickname
// can lose who made them or goes by them, when their data are deleted.
//
// A direct migration, with no expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);

  await sql`alter table first_accesses add column request_code text`.execute(db);
  const { rows } = await sql<{ identity: string }>`select identity from first_accesses`.execute(db);
  const taken = new Set<string>();
  for (const { identity } of rows) {
    let code = requestCode();
    while (taken.has(code)) code = requestCode();
    taken.add(code);
    await sql`update first_accesses set request_code = ${code} where identity = ${identity}`.execute(
      db,
    );
  }
  await sql`
    alter table first_accesses
      alter column request_code set not null,
      add constraint first_accesses_request_code_unique unique (request_code),
      add constraint first_accesses_request_code_check
        check (request_code ~ '^[0-9A-HJKMNP-TV-Z]{12}$')
  `.execute(db);

  await sql`
    create table data_deletions (
      id text primary key,
      identity text not null,
      reason text not null check (reason in ('request', 'game-consent-withdrawn', 'inactivity')),
      requested_at timestamptz not null,
      erased_at timestamptz
    )
  `.execute(db);
  await sql`create index data_deletions_by_identity on data_deletions (identity)`.execute(db);
  await sql`
    create index data_deletions_pending on data_deletions (requested_at) where erased_at is null
  `.execute(db);

  await sql`
    alter table legal_acceptances
      add column withdrawn_at timestamptz,
      add constraint legal_acceptances_only_the_game_consent_is_withdrawn
        check (withdrawn_at is null or document = 'game-consent')
  `.execute(db);
  await sql`
    create table analytics_objections (
      identity text primary key,
      objected_at timestamptz not null
    )
  `.execute(db);

  await sql`
    create table analytics_events (
      id text primary key,
      identity text not null,
      kind text not null check (kind in (
        'first-visit', 'room-created', 'room-joined', 'game-started', 'game-ended'
      )),
      occurred_at timestamptz not null,
      fact jsonb not null
    )
  `.execute(db);
  await sql`
    create index analytics_events_by_identity on analytics_events (identity, occurred_at)
  `.execute(db);
  await sql`
    create index analytics_events_by_kind on analytics_events (kind, occurred_at)
  `.execute(db);

  for (const table of ['answers', 'reactions', 'dilemma_likes']) {
    await sql`
      alter table ${sql.table(table)}
        add column objects_to_analytics boolean not null default false
    `.execute(db);
    await sql`
      alter table ${sql.table(table)} alter column objects_to_analytics drop default
    `.execute(db);
  }

  await sql`alter table dilemma_reports alter column identity drop not null`.execute(db);
  await sql`
    alter table nickname_reports
      alter column identity drop not null,
      alter column owner drop not null
  `.execute(db);
  await sql`alter table illegal_content_notices alter column identity drop not null`.execute(db);
  // The check that a nickname issue has its owner, which loses it when the owner deletes their data.
  const { rows: checks } = await sql<{ name: string }>`
    select conname as name from pg_constraint
    where conrelid = 'moderation_issues'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%nickname_owner IS NOT NULL%'
  `.execute(db);
  for (const { name } of checks) {
    await sql`alter table moderation_issues drop constraint ${sql.id(name)}`.execute(db);
  }
  await sql`
    alter table moderation_issues
      add constraint moderation_issues_nickname_check
        check ((content_kind = 'nickname') = (nickname is not null))
  `.execute(db);
}
