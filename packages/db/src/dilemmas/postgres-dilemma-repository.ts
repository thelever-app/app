import {
  type Category,
  type Creator,
  Dilemma,
  type DilemmaCriteria,
  type DilemmaRepository,
  type DilemmaSnapshot,
  WORD_SIMILARITY,
} from '@thelever-app/dilemmas';
import { type Kysely, type RawBuilder, sql, type Transaction } from 'kysely';
import { jsonArrayFrom } from 'kysely/helpers/postgres';
import type { DilemmasTables } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

function creatorOf({
  creator_type,
  creator_identity,
}: Pick<DilemmasTables['dilemmas'], 'creator_type' | 'creator_identity'>): Creator {
  if (creator_type === 'player') return { type: 'player', identity: creator_identity ?? '' };
  return { type: creator_type };
}

/** Each version in its own rows, inserted once; saving again only changes the status and the visibility. */
export class PostgresDilemmaRepository implements DilemmaRepository {
  readonly #db: Kysely<DilemmasTables>;

  constructor(db: Kysely<DilemmasTables>) {
    this.#db = db;
  }

  async save(dilemma: Dilemma): Promise<void> {
    const transaction = currentTransaction<DilemmasTables>();
    if (transaction) return this.#save(transaction, dilemma.toSnapshot());
    await this.#db.transaction().execute((own) => this.#save(own, dilemma.toSnapshot()));
  }

  async findById(id: string): Promise<Dilemma | undefined> {
    const latest = await (currentTransaction<DilemmasTables>() ?? this.#db)
      .selectFrom('dilemma_versions')
      .select('number')
      .where('dilemma_id', '=', id)
      .orderBy('number', 'desc')
      .limit(1)
      .executeTakeFirst();
    return latest && this.findVersion(id, latest.number);
  }

  async findVersion(id: string, version: number): Promise<Dilemma | undefined> {
    const db = currentTransaction<DilemmasTables>() ?? this.#db;
    const row = await db
      .selectFrom('dilemmas')
      .innerJoin('dilemma_versions', 'dilemma_versions.dilemma_id', 'dilemmas.id')
      .selectAll(['dilemmas', 'dilemma_versions'])
      .where('dilemmas.id', '=', id)
      .where('dilemma_versions.number', '=', version)
      .executeTakeFirst();
    if (!row) return undefined;

    const options = await db
      .selectFrom('dilemma_version_options')
      .select(['option_id', 'text'])
      .where('dilemma_id', '=', id)
      .where('version', '=', version)
      .orderBy('position')
      .execute();
    const tags = await db
      .selectFrom('dilemma_version_tags')
      .select('tag')
      .where('dilemma_id', '=', id)
      .where('version', '=', version)
      .orderBy('position')
      .execute();

    return Dilemma.restore({
      id: row.id,
      language: row.language,
      creator: creatorOf(row),
      visibility: row.visibility,
      version: {
        number: row.number,
        text: row.text,
        options: options.map(({ option_id, text }) => ({ id: option_id, text })),
        category: row.category,
        tags: tags.map(({ tag }) => tag),
        minimumAge: row.minimum_age,
        status: row.status,
      },
    });
  }

  async search(criteria: DilemmaCriteria): Promise<Dilemma[]> {
    const db = currentTransaction<DilemmasTables>() ?? this.#db;
    const { dilemmaIds, categories, maximumMinimumAge, status } = criteria;
    if (dilemmaIds?.length === 0 || categories?.length === 0) return [];
    const typed = criteria.text?.trim() ?? '';
    const words = typed.split(/\s+/).filter((word) => word.length > 0);

    const rows = await db
      .selectFrom('dilemmas')
      .innerJoin('dilemma_versions', 'dilemma_versions.dilemma_id', 'dilemmas.id')
      .selectAll(['dilemmas', 'dilemma_versions'])
      .select((eb) => [
        jsonArrayFrom(
          eb
            .selectFrom('dilemma_version_options')
            .select(['option_id as id', 'text'])
            .whereRef('dilemma_version_options.dilemma_id', '=', 'dilemma_versions.dilemma_id')
            .whereRef('dilemma_version_options.version', '=', 'dilemma_versions.number')
            .orderBy('position'),
        ).as('options'),
        jsonArrayFrom(
          eb
            .selectFrom('dilemma_version_tags')
            .select('tag')
            .whereRef('dilemma_version_tags.dilemma_id', '=', 'dilemma_versions.dilemma_id')
            .whereRef('dilemma_version_tags.version', '=', 'dilemma_versions.number')
            .orderBy('position'),
        ).as('tags'),
      ])
      .where('dilemmas.visibility', '=', 'public')
      // Only the current version of each dilemma: no later one exists.
      .where(({ not, exists, selectFrom }) =>
        not(
          exists(
            selectFrom('dilemma_versions as later')
              .select('later.number')
              .whereRef('later.dilemma_id', '=', 'dilemma_versions.dilemma_id')
              .whereRef('later.number', '>', 'dilemma_versions.number'),
          ),
        ),
      )
      .where('dilemma_versions.status', '=', status)
      .where('dilemma_versions.minimum_age', '<=', maximumMinimumAge)
      .$if(dilemmaIds !== undefined, (query) => query.where('dilemmas.id', 'in', dilemmaIds ?? []))
      .$if(categories !== undefined, (query) =>
        query.where('dilemma_versions.category', 'in', (categories ?? []) as Category[]),
      )
      // Every word typed is part of the text or a tag, or alike enough to one.
      .$if(words.length > 0, (query) =>
        query.where(sql<boolean>`${sql.join(words.map(matchesTextOrTag), sql` and `)}`),
      )
      // A tag equal to what was typed first, then the most alike to the text or a tag.
      .$if(words.length > 0, (query) =>
        query
          .orderBy(sql`${hasTag(sql`= search_text(${typed})`)} desc`)
          .orderBy(sql`${similarityTo(typed)} desc`),
      )
      // Byte order, as the other implementations sort.
      .orderBy(sql`dilemmas.id collate "C"`)
      .execute();

    return rows.map((row) =>
      Dilemma.restore({
        id: row.id,
        language: row.language,
        creator: creatorOf(row),
        visibility: row.visibility,
        version: {
          number: row.number,
          text: row.text,
          options: row.options,
          category: row.category,
          tags: row.tags.map(({ tag }) => tag),
          minimumAge: row.minimum_age,
          status: row.status,
        },
      }),
    );
  }

  async #save(db: Transaction<DilemmasTables>, snapshot: DilemmaSnapshot): Promise<void> {
    const { id, language, creator, visibility, version } = snapshot;
    const creatorColumns = {
      creator_type: creator.type,
      creator_identity: creator.type === 'player' ? creator.identity : null,
    };
    await db
      .insertInto('dilemmas')
      .values({ id, language, visibility, ...creatorColumns })
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet({ visibility, ...creatorColumns }),
      )
      .execute();

    const saved = await db
      .selectFrom('dilemma_versions')
      .select('number')
      .where('dilemma_id', '=', id)
      .where('number', '=', version.number)
      .executeTakeFirst();
    if (saved) {
      await db
        .updateTable('dilemma_versions')
        .set({ status: version.status })
        .where('dilemma_id', '=', id)
        .where('number', '=', version.number)
        .execute();
      return;
    }

    await db
      .insertInto('dilemma_versions')
      .values({
        dilemma_id: id,
        number: version.number,
        text: version.text,
        category: version.category,
        minimum_age: version.minimumAge,
        status: version.status,
      })
      .execute();
    await db
      .insertInto('dilemma_version_options')
      .values(
        version.options.map((option, position) => ({
          dilemma_id: id,
          version: version.number,
          position,
          option_id: option.id,
          text: option.text,
        })),
      )
      .execute();
    if (version.tags.length > 0) {
      await db
        .insertInto('dilemma_version_tags')
        .values(
          version.tags.map((tag, position) => ({
            dilemma_id: id,
            version: version.number,
            position,
            tag,
          })),
        )
        .execute();
    }
  }
}

/** Whether a tag of the version of the dilemma, as search_text leaves it, holds the condition. */
function hasTag(condition: RawBuilder<unknown>): RawBuilder<boolean> {
  return sql<boolean>`exists (
    select 1 from dilemma_version_tags as typed_tags
    where typed_tags.dilemma_id = dilemma_versions.dilemma_id
      and typed_tags.version = dilemma_versions.number
      and search_text(typed_tags.tag) ${condition}
  )`;
}

/** A word typed is part of the text or of a tag, or alike enough to one, as pg_trgm measures it. */
function matchesTextOrTag(word: string): RawBuilder<boolean> {
  const alike = (field: RawBuilder<unknown>) =>
    sql`(strpos(${field}, search_text(${word})) > 0
      or word_similarity(search_text(${word}), ${field}) >= ${WORD_SIMILARITY})`;
  return sql<boolean>`(${alike(sql`search_text(dilemma_versions.text)`)} or exists (
    select 1 from dilemma_version_tags as typed_tags
    where typed_tags.dilemma_id = dilemma_versions.dilemma_id
      and typed_tags.version = dilemma_versions.number
      and ${alike(sql`search_text(typed_tags.tag)`)}
  ))`;
}

/** How alike what was typed is to the text or to the most alike tag, from 0 to 1. */
function similarityTo(typed: string): RawBuilder<number> {
  return sql<number>`greatest(
    word_similarity(search_text(${typed}), search_text(dilemma_versions.text)),
    coalesce((
      select max(word_similarity(search_text(${typed}), search_text(typed_tags.tag)))
      from dilemma_version_tags as typed_tags
      where typed_tags.dilemma_id = dilemma_versions.dilemma_id
        and typed_tags.version = dilemma_versions.number
    ), 0)
  )`;
}
