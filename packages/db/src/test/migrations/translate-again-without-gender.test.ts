import { randomUUID } from 'node:crypto';
import { Dilemma } from '@thelever-app/dilemmas';
import { SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { type Kysely, sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import { PostgresDilemmaRepository } from '../../dilemmas/postgres-dilemma-repository.ts';
import { migrateTo } from '../../migrator.ts';
import type { Database } from '../../schema.ts';
import { onServer, urlOf } from '../support/test-database.ts';

const BEFORE = '0013-translations';
const THIS = '0014-translate-again-without-gender';
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
  // The repository saves the dilemmas as they are today, with the public id, the classification
  // and the moderation later migrations add; this one neither reads nor changes them.
  await sql`
    alter table dilemmas
      add column public_id text,
      add column moderation text,
      add column moderation_status_before text
  `.execute(db);
  await sql`
    alter table dilemma_versions
      add column type text,
      add column compromising boolean,
      add column scale text,
      add column fixed_order boolean,
      add column has_gap boolean
  `.execute(db);
  return db;
}

const ARGUMENTS = {
  context: 'Contexto',
  options: [
    { for: 'A favor de contarlo', against: 'En contra de contarlo' },
    { for: 'A favor de callar', against: 'En contra de callar' },
  ],
};

/** An original with its arguments, and its translations into English and French. */
async function catalogBefore(db: Kysely<Database>) {
  const repository = new PostgresDilemmaRepository(db);
  const ids = new SequentialIdGenerator('dilemma');
  const original = Dilemma.create(
    {
      text: '¿Se lo cuentas a {gap}?',
      language: 'es',
      name: 'El secreto',
      options: ['Se lo cuento', 'Me callo'],
      category: 'honesty',
      tags: ['secreto'],
      minimumAge: 16,
      type: 'standard',
      compromising: false,
      scale: 'everyday',
      fixedOrder: false,
    },
    ids,
  );
  original.argue({
    context: ARGUMENTS.context,
    options: original.options.map(({ id }, index) => ({
      optionId: id,
      ...ARGUMENTS.options[index]!,
    })),
  });
  await repository.save(original);
  const translations = ['en', 'fr'].map((language) =>
    Dilemma.translate(
      original,
      {
        language,
        name: `${language}: secret`,
        text: `${language}: do you tell {gap}?`,
        options: [`${language}: tell`, `${language}: keep quiet`],
        tags: [`${language}: secret`],
      },
      ids,
    ),
  );
  for (const translation of translations) {
    translation.argue({
      options: translation.options.map(({ id }) => ({
        optionId: id,
        for: 'for',
        against: 'against',
      })),
    });
    await repository.save(translation);
  }
  return { repository, original, translations };
}

describe('the migration that translates the catalog again, without giving anyone a gender', () => {
  it('should delete the automatic translations, with everything of their versions', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    const { repository, translations } = await catalogBefore(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    for (const translation of translations) {
      expect(await repository.findById(translation.id)).toBeUndefined();
    }
    for (const table of [
      'dilemma_versions',
      'dilemma_version_options',
      'dilemma_version_tags',
      'dilemma_version_arguments',
      'dilemma_version_option_arguments',
    ]) {
      const { rows } = await sql<{ count: string }>`
        select count(*) from ${sql.table(table)}
        where dilemma_id in (${sql.join(translations.map(({ id }) => id))})
      `.execute(db);
      expect(rows[0]?.count, table).toBe('0');
    }
  });

  it('should keep the originals as they were, with their name and arguments', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    const { repository, original } = await catalogBefore(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    expect((await repository.findById(original.id))?.toSnapshot()).toEqual(original.toSnapshot());
  });

  it('should keep a translation a person reviewed', async () => {
    // Arrange
    const db = await databaseAt(BEFORE);
    const { repository, translations } = await catalogBefore(db);
    const [reviewed] = translations;
    await sql`
      update dilemma_versions set translation = 'reviewed' where dilemma_id = ${reviewed!.id}
    `.execute(db);

    // Act
    await migrateTo(db, THIS);

    // Assert
    expect(await repository.findById(reviewed!.id)).toBeDefined();
  });
});
