import { randomUUID } from 'node:crypto';
import { type Kysely, sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { migrateTo } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const BEFORE = '0034-round-content-axes';
const THIS = '0035-moderation';
const cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

/** An empty database of its own, migrated up to `migration`. */
async function databaseAt(migration: string): Promise<Kysely<Database>> {
  const name = `thelever_test_${randomUUID().replaceAll('-', '')}`;
  await onServer((quote) => `CREATE DATABASE ${quote(name)}`);
  const { db, close } = await openDatabase<Database>(
    { kind: 'url', url: urlOf(name) },
    { maxConnections: 2, logger: new ConsoleLogger() },
  );
  cleanups.push(async () => {
    await close();
    await onServer((quote) => `DROP DATABASE IF EXISTS ${quote(name)} WITH (FORCE)`);
  });
  await migrateTo(db, migration);
  return db;
}

/** Dilemma 7 of the catalog and its translation into English, reported before Moderation had issues. */
async function reportedDilemmas(db: Kysely<Database>): Promise<void> {
  for (const id of ['dlm-7', 'dlm-7-en']) {
    await sql`
      insert into dilemmas (id, public_id, language, creator_type, visibility)
      values (${id}, ${`${id}Public`}, 'es', 'curation-team', 'public')
    `.execute(db);
    await sql`
      insert into dilemma_versions (dilemma_id, number, text, category, minimum_age, type,
        compromising, scale, fixed_order, has_gap, status)
      values (${id}, 1, 'TestText', 'honesty', 16, 'standard', false, 'everyday', false, false,
        'in-catalog')
    `.execute(db);
  }
  const reports = [
    ['TestReport2', 'dlm-7', '2026-11-21T11:00:00Z'],
    ['TestReport1', 'dlm-7', '2026-11-21T10:00:00Z'],
    ['TestReport3', 'dlm-7-en', '2026-11-21T12:00:00Z'],
  ];
  for (const [id, dilemmaId, at] of reports) {
    await sql`
      insert into dilemma_reports (id, dilemma_id, version, reason, comment, identity, reported_at)
      values (${id}, ${dilemmaId}, 1, 'offensive', null, 'TestIdentity', ${at})
    `.execute(db);
  }
}

describe(`Migration ${THIS}`, () => {
  it('should give the reports kept before an issue for each dilemma, read in its language', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await reportedDilemmas(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    const reports = await db
      .selectFrom('dilemma_reports')
      .select(['id', 'issue_id', 'language'])
      .orderBy('id')
      .execute();
    expect(reports).toEqual([
      { id: 'TestReport1', issue_id: 'migrated-dlm-7', language: 'es' },
      { id: 'TestReport2', issue_id: 'migrated-dlm-7', language: 'es' },
      { id: 'TestReport3', issue_id: 'migrated-dlm-7-en', language: 'en' },
    ]);
    const issues = await db
      .selectFrom('moderation_issues')
      .select(['id', 'content_kind', 'dilemma_id', 'number', 'outcome'])
      .orderBy('id')
      .execute();
    expect(issues).toEqual([
      {
        id: 'migrated-dlm-7',
        content_kind: 'dilemma',
        dilemma_id: 'dlm-7',
        number: null,
        outcome: null,
      },
      {
        id: 'migrated-dlm-7-en',
        content_kind: 'dilemma',
        dilemma_id: 'dlm-7-en',
        number: null,
        outcome: null,
      },
    ]);
  });

  it('should leave in the outbox the opening of each issue with its first report, then the rest', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await reportedDilemmas(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    const outbox = await db
      .selectFrom('moderation_outbox')
      .select(['issue_id', 'event'])
      .orderBy('id')
      .execute();
    expect(outbox).toEqual([
      { issue_id: 'migrated-dlm-7', event: { type: 'opened', entryId: 'TestReport1' } },
      { issue_id: 'migrated-dlm-7', event: { type: 'received', entryId: 'TestReport2' } },
      { issue_id: 'migrated-dlm-7-en', event: { type: 'opened', entryId: 'TestReport3' } },
    ]);
  });

  it('should hide, with its translations, a dilemma 3 different players had reported', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await reportedDilemmas(db);
    for (const identity of ['TestIdentity2', 'TestIdentity3']) {
      await sql`
        insert into dilemma_reports (id, dilemma_id, version, reason, comment, identity,
          reported_at)
        values (${`TestReportOf${identity}`}, 'dlm-7', 1, 'offensive', null, ${identity},
          '2026-11-21T13:00:00Z')
      `.execute(db);
    }

    // Act
    await migrateTo(db, THIS);

    // Assert
    const issues = await db
      .selectFrom('moderation_issues')
      .select(['id', 'hidden'])
      .orderBy('id')
      .execute();
    expect(issues).toEqual([
      { id: 'migrated-dlm-7', hidden: true },
      { id: 'migrated-dlm-7-en', hidden: false },
    ]);
    const dilemmas = await db
      .selectFrom('dilemmas')
      .innerJoin('dilemma_versions', 'dilemma_versions.dilemma_id', 'dilemmas.id')
      .select(['id', 'status', 'moderation', 'moderation_status_before'])
      .orderBy('id')
      .execute();
    expect(dilemmas).toEqual([
      {
        id: 'dlm-7',
        status: 'hidden-by-reports',
        moderation: 'hidden-by-reports',
        moderation_status_before: 'in-catalog',
      },
      {
        id: 'dlm-7-en',
        status: 'hidden-by-reports',
        moderation: 'hidden-by-reports',
        moderation_status_before: 'in-catalog',
      },
    ]);
    const outbox = await db
      .selectFrom('moderation_outbox')
      .select('event')
      .where('issue_id', '=', 'migrated-dlm-7')
      .orderBy('id')
      .execute();
    expect(outbox.map(({ event }) => event.type)).toEqual([
      'opened',
      'received',
      'received',
      'received',
      'hidden',
    ]);
  });

  it('should hide no dilemma that fewer than 3 different players had reported', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await reportedDilemmas(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    const dilemmas = await db.selectFrom('dilemmas').select('moderation').execute();
    expect(dilemmas).toEqual([{ moderation: null }, { moderation: null }]);
  });

  it('should take a dilemma reported as possibly illegal from now on', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    await reportedDilemmas(db);
    await migrateTo(db, THIS);

    // Act & Assert
    await expect(
      sql`
        insert into dilemma_reports (id, issue_id, dilemma_id, version, reason, comment, language,
          identity, reported_at)
        values ('TestReport4', 'migrated-dlm-7', 'dlm-7', 1, 'illegal', null, 'es', 'TestIdentity',
          now())
      `.execute(db),
    ).resolves.toBeDefined();
  });
});
