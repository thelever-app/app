import {
  type ArgumentsSnapshot,
  type Category,
  type Creator,
  Dilemma,
  type DilemmaCriteria,
  type DilemmaRepository,
  type DilemmaSnapshot,
  type TranslationOf,
  WORD_SIMILARITY,
} from '@thelever-app/dilemmas';
import {
  type ExpressionBuilder,
  type Kysely,
  type RawBuilder,
  type Selectable,
  sql,
  type Transaction,
} from 'kysely';
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

type Row = Selectable<DilemmasTables['dilemmas']> &
  Selectable<DilemmasTables['dilemma_versions']> & {
    readonly options: readonly { readonly id: string; readonly text: string }[];
    readonly tags: readonly { readonly tag: string }[];
    readonly argument_context: readonly { readonly context: string | null }[];
    readonly option_arguments: readonly {
      readonly optionId: string;
      readonly for: string;
      readonly against: string;
    }[];
  };

/** The rows of a version as the dilemma they make. */
function dilemmaOf(row: Row): Dilemma {
  const [argued] = row.argument_context;
  const args: ArgumentsSnapshot | undefined = argued && {
    ...(argued.context === null ? {} : { context: argued.context }),
    options: row.option_arguments,
  };
  return Dilemma.restore({
    id: row.id,
    language: row.language,
    ...(row.name === null ? {} : { name: row.name }),
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
      ...(row.translation_of === null ||
      row.translation_of_version === null ||
      row.translation === null
        ? {}
        : {
            translationOf: { dilemmaId: row.translation_of, version: row.translation_of_version },
            translation: row.translation,
          }),
      ...(args === undefined ? {} : { arguments: args }),
    },
  });
}

/** The options, the tags and the arguments of the version in each row, in order. */
function contentOfTheVersion(
  eb: ExpressionBuilder<DilemmasTables, 'dilemmas' | 'dilemma_versions'>,
) {
  return [
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
    jsonArrayFrom(
      eb
        .selectFrom('dilemma_version_arguments')
        .select('context')
        .whereRef('dilemma_version_arguments.dilemma_id', '=', 'dilemma_versions.dilemma_id')
        .whereRef('dilemma_version_arguments.version', '=', 'dilemma_versions.number'),
    ).as('argument_context'),
    jsonArrayFrom(
      eb
        .selectFrom('dilemma_version_option_arguments as argued')
        .innerJoin('dilemma_version_options as argued_option', (join) =>
          join
            .onRef('argued_option.dilemma_id', '=', 'argued.dilemma_id')
            .onRef('argued_option.version', '=', 'argued.version')
            .onRef('argued_option.option_id', '=', 'argued.option_id'),
        )
        .select([
          'argued.option_id as optionId',
          'argued.argument_for as for',
          'argued.argument_against as against',
        ])
        .whereRef('argued.dilemma_id', '=', 'dilemma_versions.dilemma_id')
        .whereRef('argued.version', '=', 'dilemma_versions.number')
        .orderBy('argued_option.position'),
    ).as('option_arguments'),
  ] as const;
}

/**
 * Each version in its own rows, inserted once; saving again only changes the status, the
 * visibility, the name and the arguments of the version saved.
 */
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
    const row = await this.#versions()
      .where('dilemmas.id', '=', id)
      .where('dilemma_versions.number', '=', version)
      .executeTakeFirst();
    return row && dilemmaOf(row);
  }

  async findTranslation(original: TranslationOf, language: string): Promise<Dilemma | undefined> {
    const row = await this.#versions()
      .where('dilemmas.translation_of', '=', original.dilemmaId)
      .where('dilemmas.language', '=', language)
      .where('dilemma_versions.translation_of_version', '=', original.version)
      .executeTakeFirst();
    return row && dilemmaOf(row);
  }

  async search(criteria: DilemmaCriteria): Promise<Dilemma[]> {
    const db = currentTransaction<DilemmasTables>() ?? this.#db;
    const { dilemmaIds, categories, maximumMinimumAge, status } = criteria;
    if (dilemmaIds?.length === 0 || categories?.length === 0) return [];
    const typed = criteria.text?.trim() ?? '';
    const words = typed.split(/\s+/).filter((word) => word.length > 0);

    const rows = await this.#versions(db)
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
      .$if(criteria.language !== undefined, (query) =>
        query.where('dilemmas.language', '=', criteria.language ?? ''),
      )
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

    return rows.map(dilemmaOf);
  }

  /** Every version of every dilemma, with its content, to narrow down. */
  #versions(db: Kysely<DilemmasTables> = currentTransaction<DilemmasTables>() ?? this.#db) {
    return db
      .selectFrom('dilemmas')
      .innerJoin('dilemma_versions', 'dilemma_versions.dilemma_id', 'dilemmas.id')
      .selectAll(['dilemmas', 'dilemma_versions'])
      .select(contentOfTheVersion);
  }

  async #save(db: Transaction<DilemmasTables>, snapshot: DilemmaSnapshot): Promise<void> {
    const { id, language, creator, visibility, version } = snapshot;
    const changing = {
      visibility,
      name: snapshot.name ?? null,
      creator_type: creator.type,
      creator_identity: creator.type === 'player' ? creator.identity : null,
    };
    await db
      .insertInto('dilemmas')
      .values({
        id,
        language,
        translation_of: version.translationOf?.dilemmaId ?? null,
        ...changing,
      })
      .onConflict((conflict) => conflict.column('id').doUpdateSet(changing))
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
      await this.#saveArguments(db, id, version.number, version.arguments);
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
        translation_of_version: version.translationOf?.version ?? null,
        translation: version.translation ?? null,
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
    await this.#saveArguments(db, id, version.number, version.arguments);
  }

  /** The arguments of that version as they are now, replacing what it had. */
  async #saveArguments(
    db: Transaction<DilemmasTables>,
    dilemmaId: string,
    version: number,
    args: ArgumentsSnapshot | undefined,
  ): Promise<void> {
    await db
      .deleteFrom('dilemma_version_arguments')
      .where('dilemma_id', '=', dilemmaId)
      .where('version', '=', version)
      .execute();
    if (!args) return;
    await db
      .insertInto('dilemma_version_arguments')
      .values({ dilemma_id: dilemmaId, version, context: args.context ?? null })
      .execute();
    await db
      .insertInto('dilemma_version_option_arguments')
      .values(
        args.options.map((option) => ({
          dilemma_id: dilemmaId,
          version,
          option_id: option.optionId,
          argument_for: option.for,
          argument_against: option.against,
        })),
      )
      .execute();
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
