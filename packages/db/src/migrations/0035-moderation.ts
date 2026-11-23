import { type Kysely, sql } from 'kysely';

// Moderation: the issues of the moderation repository, each with the reports and notices of one
// content until the team decides; the reports of nicknames and the notices of the web form; the
// outbox of what the issues still have to tell GitHub and the senders of notices; and the
// moderation notices that wait for a player to open the app. All kept 3 years, like the reports
// (DEC-251). The dilemmas keep whether Moderation keeps them out of new games, so loading the
// catalog never brings them back.
//
// The reports kept before this migration get an issue for each dilemma, with an id the migration
// makes, and their events in the outbox, so the job takes them to the repository; the language
// they were read in is that of the dilemma reported. A direct migration, with no expand and
// contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    alter table dilemmas
      add column moderation text check (moderation in ('hidden-by-reports', 'withdrawn')),
      add column moderation_status_before text check (moderation_status_before in (
        'in-review', 'rejected', 'approved', 'in-exploration', 'in-catalog',
        'out-of-exploration', 'hidden-by-reports', 'withdrawn'
      )),
      add constraint dilemmas_moderation_complete
        check ((moderation is null) = (moderation_status_before is null))
  `.execute(db);
  await sql`
    create table moderation_issues (
      id text primary key,
      content_kind text not null check (content_kind in ('dilemma', 'nickname', 'reference')),
      dilemma_id text references dilemmas (id),
      nickname text,
      nickname_owner text,
      reference text,
      number integer unique,
      opened_at timestamptz not null,
      hidden boolean not null default false,
      outcome text check (outcome in ('withdrawn', 'kept')),
      facts text,
      translated_facts jsonb,
      rule text,
      decided_at timestamptz,
      check ((content_kind = 'dilemma') = (dilemma_id is not null)),
      check ((content_kind = 'nickname') = (nickname is not null and nickname_owner is not null)),
      check ((content_kind = 'reference') = (reference is not null)),
      check (
        (outcome is null) = (facts is null)
        and (outcome is null) = (translated_facts is null)
        and (outcome is null) = (rule is null)
        and (outcome is null) = (decided_at is null)
      )
    )
  `.execute(db);
  // One undecided issue per content: a second report goes on it.
  await sql`
    create unique index moderation_issues_undecided_dilemma on moderation_issues (dilemma_id)
      where content_kind = 'dilemma' and outcome is null
  `.execute(db);
  await sql`
    create unique index moderation_issues_undecided_nickname
      on moderation_issues (nickname_owner, nickname)
      where content_kind = 'nickname' and outcome is null
  `.execute(db);

  await sql`
    alter table dilemma_reports
      add column issue_id text references moderation_issues (id),
      add column language text check (language in ('es', 'en', 'fr', 'de', 'it', 'pt', 'ca')),
      drop constraint dilemma_reports_reason_check,
      add constraint dilemma_reports_reason_check
        check (reason in ('offensive', 'confusing', 'mistranslated', 'illegal', 'other'))
  `.execute(db);
  await sql`
    insert into moderation_issues (id, content_kind, dilemma_id, opened_at)
    select 'migrated-' || dilemma_id, 'dilemma', dilemma_id, min(reported_at)
    from dilemma_reports group by dilemma_id
  `.execute(db);
  await sql`
    update dilemma_reports set
      issue_id = 'migrated-' || dilemma_id,
      language = coalesce(substring(dilemma_id from '-([a-z]{2})$'), 'es')
  `.execute(db);
  await sql`
    alter table dilemma_reports
      alter column issue_id set not null,
      alter column language set not null
  `.execute(db);
  await sql`create index dilemma_reports_by_issue on dilemma_reports (issue_id)`.execute(db);

  await sql`
    create table nickname_reports (
      id text primary key,
      issue_id text not null references moderation_issues (id),
      nickname text not null,
      owner text not null,
      reason text not null check (reason in ('offensive', 'impersonation', 'illegal', 'other')),
      comment text check (char_length(comment) <= 280),
      identity text not null,
      reported_at timestamptz not null
    )
  `.execute(db);
  await sql`create index nickname_reports_by_issue on nickname_reports (issue_id)`.execute(db);
  await sql`
    create table illegal_content_notices (
      id text primary key,
      issue_id text not null references moderation_issues (id),
      reference text not null check (char_length(reference) between 1 and 500),
      explanation text not null check (char_length(explanation) between 1 and 2000),
      name text check (char_length(name) <= 100),
      email text check (char_length(email) <= 254),
      language text not null check (language in ('es', 'en', 'fr', 'de', 'it', 'pt', 'ca')),
      identity text not null,
      sent_at timestamptz not null
    )
  `.execute(db);
  await sql`
    create index illegal_content_notices_by_issue on illegal_content_notices (issue_id)
  `.execute(db);
  await sql`
    create index illegal_content_notices_by_sender on illegal_content_notices (identity, sent_at)
  `.execute(db);

  await sql`
    create table moderation_outbox (
      id bigint generated always as identity primary key,
      issue_id text not null references moderation_issues (id),
      event jsonb not null
    )
  `.execute(db);
  // The reports kept before: the first of each dilemma opens its issue, the rest go on it.
  await sql`
    insert into moderation_outbox (issue_id, event)
    select issue_id,
      case when position = 1
        then jsonb_build_object('type', 'opened', 'entryId', id)
        else jsonb_build_object('type', 'received', 'entryId', id)
      end
    from (
      select id, issue_id, reported_at,
        row_number() over (partition by issue_id order by reported_at, id) as position
      from dilemma_reports
    ) as reports
    order by issue_id, reported_at, id
  `.execute(db);

  await sql`
    create table moderation_notices (
      id text primary key,
      identity text not null,
      subject jsonb not null,
      outcome text not null check (outcome in ('withdrawn', 'kept')),
      rule text not null,
      decided_at timestamptz not null,
      seen_at timestamptz
    )
  `.execute(db);
  await sql`
    create index moderation_notices_unseen on moderation_notices (identity, decided_at)
      where seen_at is null
  `.execute(db);
}
