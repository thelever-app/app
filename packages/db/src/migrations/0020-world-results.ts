import { type Kysely, sql } from 'kysely';

// The world result of each version of a dilemma, its translations counted with their original
// (Dilemmas). world_counts are the answers of the moment to each option, by its position;
// world_results, the ones published once a day, which are all the app reads. A vote alone leaves
// a receipt, to count each identity once per version, with neither the option nor the time, so no
// receipt can be crossed with the counts to tell what anyone voted.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  for (const table of ['world_counts', 'world_results']) {
    await sql`
      create table ${sql.table(table)} (
        dilemma_id text not null,
        version integer not null,
        position smallint not null check (position >= 0),
        answers integer not null check (answers > 0),
        primary key (dilemma_id, version, position),
        foreign key (dilemma_id, version) references dilemma_versions (dilemma_id, number)
          on delete cascade
      )
    `.execute(db);
  }
  await sql`
    create table world_vote_receipts (
      identity text not null,
      dilemma_id text not null,
      version integer not null,
      primary key (identity, dilemma_id, version),
      foreign key (dilemma_id, version) references dilemma_versions (dilemma_id, number)
        on delete cascade
    )
  `.execute(db);
}
