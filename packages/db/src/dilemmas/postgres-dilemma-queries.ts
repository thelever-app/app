import {
  type CandidateCriteria,
  type Category,
  type DilemmaCandidate,
  type DilemmaType,
  type DilemmaCriteria,
  type DilemmaPage,
  type DilemmaQueries,
  type DilemmaSummary,
  InvalidPageError,
  type PageRequest,
  type Scale,
  WORD_SIMILARITY,
} from '@thelever-app/dilemmas';
import { type Kysely, type RawBuilder, sql } from 'kysely';
import type { DilemmasTables } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

/**
 * Where a page ends, so the next one starts right after it in the same order: by id without a
 * text; with one, by the rank of the last dilemma and then by its id.
 */
type PageEnd =
  | { readonly id: string }
  | { readonly id: string; readonly wholeTag: boolean; readonly similarity: number };

/**
 * The reads of lists of dilemmas on PostgreSQL: one query each, which gives only what a list shows
 * and pages by where the page before ended, not by an offset, so a page costs the same however far
 * it is. The text is looked for with pg_trgm, which the trigram indexes of the text and the tags back.
 */
export class PostgresDilemmaQueries implements DilemmaQueries {
  readonly #db: Kysely<DilemmasTables>;

  constructor(db: Kysely<DilemmasTables>) {
    this.#db = db;
  }

  async candidatesOf(criteria: CandidateCriteria): Promise<DilemmaCandidate[]> {
    if (criteria.categories?.length === 0 || criteria.count === 0) return [];
    const playedIds = criteria.playedBy.map(({ dilemmaId }) => dilemmaId);
    const players = criteria.playedBy.map(({ players: count }) => count);
    const played = sql<{ id: string; players: number }>`(
      select * from unnest(${playedIds}::text[], ${players}::integer[]) as played (id, players)
    )`.as('played');
    const rows = await this.#matching(this.#connection(), criteria)
      .leftJoin(played, (join) => join.onRef('played.id', '=', 'dilemmas.id'))
      .$if(!criteria.includeGap, (query) => query.where('dilemma_versions.has_gap', '=', false))
      .$if(criteria.content.age !== 'any', (query) =>
        query.where(
          'dilemma_versions.minimum_age',
          '=',
          criteria.content.age === 'adults-only' ? 18 : 16,
        ),
      )
      .$if(criteria.content.compromising === 'yes', (query) => query.where(compromisingNow()))
      .$if(criteria.content.compromising === 'no', (query) =>
        query.where(sql<boolean>`not ${compromisingNow()}`),
      )
      .$if(criteria.excludedIds.length > 0, (query) =>
        query.where(sql<boolean>`dilemmas.id <> all(${[...criteria.excludedIds]}::text[])`),
      )
      .select([
        'dilemmas.id',
        'dilemma_versions.type',
        'dilemma_versions.scale',
        'dilemma_versions.minimum_age',
        'dilemma_versions.has_gap',
      ])
      // Those played by fewer players first, and at random within each: only `count` leave the
      // database.
      .orderBy(sql`coalesce(played.players, 0)`)
      .orderBy(sql`random()`)
      .limit(criteria.count)
      .execute();
    return rows.map(({ id, type, scale, minimum_age, has_gap }) => ({
      id,
      type,
      scale,
      minimumAge: minimum_age,
      hasGap: has_gap,
    }));
  }

  async search(criteria: DilemmaCriteria, { after, size }: PageRequest): Promise<DilemmaPage> {
    const end = after === undefined ? undefined : pageEndOf(after);
    const typed = criteria.text?.trim() ?? '';
    if (end && 'wholeTag' in end !== (typed !== '')) throw new InvalidPageError(after!);
    if (criteria.dilemmaIds?.length === 0 || criteria.categories?.length === 0) {
      return { summaries: [] };
    }

    // One more than the page, to know whether there is a next one.
    const rows =
      typed === ''
        ? await this.#byId(criteria, end, size + 1)
        : // `<%` matches with the threshold of this transaction: one wrong letter.
          await this.#inTransaction(async (db) => {
            await sql`select set_config('pg_trgm.word_similarity_threshold', ${String(WORD_SIMILARITY)}, true)`.execute(
              db,
            );
            return this.#byRank(db, criteria, typed, end, size + 1);
          });
    const page = rows.slice(0, size);
    const last = rows.length > size ? page.at(-1) : undefined;
    return {
      summaries: page.map(summaryOf),
      ...(last && { next: nextAfter(last) }),
    };
  }

  #byId(criteria: DilemmaCriteria, end: PageEnd | undefined, limit: number) {
    return this.#summaries(this.#connection(), criteria)
      .$if(end !== undefined, (query) =>
        query.where(sql<boolean>`dilemmas.id collate "C" > ${end!.id}`),
      )
      .orderBy(sql`dilemmas.id collate "C"`)
      .limit(limit)
      .execute();
  }

  #byRank(
    db: Kysely<DilemmasTables>,
    criteria: DilemmaCriteria,
    typed: string,
    end: PageEnd | undefined,
    limit: number,
  ) {
    const words = typed.split(/\s+/).filter((word) => word.length > 0);
    const ranked = this.#summaries(db, criteria)
      // Every word typed is part of the text or a tag, or alike enough to one.
      .where(sql<boolean>`${sql.join(words.map(matchesTextOrTag), sql` and `)}`)
      .select([
        sql<boolean>`${hasTag(sql`= search_text(${typed})`)}`.as('whole_tag'),
        sql<number>`${similarityTo(typed)}::float8`.as('similarity'),
      ]);
    return db
      .selectFrom(ranked.as('ranked'))
      .selectAll()
      .$if(end !== undefined && 'wholeTag' in end, (query) => {
        const { id, wholeTag, similarity } = end as Extract<PageEnd, { wholeTag: boolean }>;
        // After it in the order of the search: a whole tag first, then the most alike, then by id.
        return query.where(sql<boolean>`(
          (not whole_tag and ${wholeTag})
          or (whole_tag = ${wholeTag} and (
            similarity < ${similarity}::float8
            or (similarity = ${similarity}::float8 and id collate "C" > ${id})
          ))
        )`);
      })
      .orderBy('whole_tag', 'desc')
      .orderBy('similarity', 'desc')
      .orderBy(sql`id collate "C"`)
      .limit(limit)
      .execute();
  }

  /** What a list shows of the dilemmas that match, at their current version. */
  #summaries(db: Kysely<DilemmasTables>, criteria: DilemmaCriteria) {
    return this.#matching(db, criteria)
      .$if(criteria.dilemmaIds !== undefined, (query) =>
        query.where('dilemmas.id', 'in', criteria.dilemmaIds ?? []),
      )
      .select([
        'dilemmas.id',
        'dilemma_versions.number as version',
        'dilemma_versions.text',
        'dilemma_versions.minimum_age',
        'dilemma_versions.category',
        'dilemma_versions.type',
        'dilemma_versions.scale',
        compromisingNow().as('compromising'),
        'dilemma_versions.has_gap',
        sql<string[]>`array(
          select tag from dilemma_version_tags as tags
          where tags.dilemma_id = dilemma_versions.dilemma_id
            and tags.version = dilemma_versions.number
          order by tags.position
        )`.as('tags'),
        sql<number>`(
          select count(*)::integer from dilemma_version_options as options
          where options.dilemma_id = dilemma_versions.dilemma_id
            and options.version = dilemma_versions.number
        )`.as('option_count'),
      ]);
  }

  /** The current version of each public dilemma that matches what a game and a search share. */
  #matching(db: Kysely<DilemmasTables>, criteria: Omit<DilemmaCriteria, 'text' | 'dilemmaIds'>) {
    return (
      db
        .selectFrom('dilemmas')
        .innerJoin('dilemma_versions', 'dilemma_versions.dilemma_id', 'dilemmas.id')
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
        .where('dilemma_versions.status', '=', criteria.status)
        .where('dilemma_versions.minimum_age', '<=', criteria.maximumMinimumAge)
        .$if(!criteria.includeCompromising, (query) =>
          query.where(sql<boolean>`not ${compromisingNow()}`),
        )
        .$if(criteria.language !== undefined, (query) =>
          query.where('dilemmas.language', '=', criteria.language ?? ''),
        )
        .$if(criteria.categories !== undefined, (query) =>
          query.where('dilemma_versions.category', 'in', criteria.categories ?? []),
        )
    );
  }

  #connection(): Kysely<DilemmasTables> {
    return currentTransaction<DilemmasTables>() ?? this.#db;
  }

  /** In the transaction of the command, or in one of its own. */
  async #inTransaction<T>(work: (db: Kysely<DilemmasTables>) => Promise<T>): Promise<T> {
    const transaction = currentTransaction<DilemmasTables>();
    if (transaction) return work(transaction);
    return this.#db.transaction().execute(work);
  }
}

interface SummaryRow {
  readonly id: string;
  readonly version: number;
  readonly text: string;
  readonly minimum_age: number;
  readonly category: Category;
  readonly tags: string[];
  readonly option_count: number;
  readonly compromising: boolean;
  readonly type: DilemmaType;
  readonly scale: Scale;
  readonly has_gap: boolean;
  readonly whole_tag?: boolean;
  readonly similarity?: number;
}

function summaryOf(row: SummaryRow): DilemmaSummary {
  return {
    id: row.id,
    version: row.version,
    text: row.text,
    minimumAge: row.minimum_age as DilemmaSummary['minimumAge'],
    category: row.category,
    tags: row.tags,
    optionCount: row.option_count,
    compromising: row.compromising,
    type: row.type,
    scale: row.scale,
    hasGap: row.has_gap,
  };
}

/** Where the next page starts, after that row: opaque to whoever pages. */
function nextAfter(row: SummaryRow): string {
  const end: PageEnd =
    row.whole_tag === undefined || row.similarity === undefined
      ? { id: row.id }
      : { id: row.id, wholeTag: row.whole_tag, similarity: row.similarity };
  return Buffer.from(JSON.stringify(end)).toString('base64url');
}

/** Where the page before ended, or InvalidPageError if `after` is not where a page ends. */
function pageEndOf(after: string): PageEnd {
  try {
    const end: unknown = JSON.parse(Buffer.from(after, 'base64url').toString());
    if (typeof end === 'object' && end !== null && 'id' in end && typeof end.id === 'string') {
      if (!('wholeTag' in end) && !('similarity' in end)) return { id: end.id };
      if (
        'wholeTag' in end &&
        typeof end.wholeTag === 'boolean' &&
        'similarity' in end &&
        typeof end.similarity === 'number'
      ) {
        return { id: end.id, wholeTag: end.wholeTag, similarity: end.similarity };
      }
    }
  } catch {
    // Not a page of a search.
  }
  throw new InvalidPageError(after);
}

/**
 * Whether the version of the dilemma is compromising, or it is a translation whose original is
 * compromising at its current version: one the translator has not caught up with yet.
 */
function compromisingNow(): RawBuilder<boolean> {
  return sql<boolean>`(dilemma_versions.compromising or exists (
    select 1 from dilemma_versions as original_now
    where original_now.dilemma_id = dilemmas.translation_of
      and original_now.compromising
      and not exists (
        select 1 from dilemma_versions as later_original
        where later_original.dilemma_id = original_now.dilemma_id
          and later_original.number > original_now.number
      )
  ))`;
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

/**
 * A word typed is part of the text or of a tag, or alike enough to one, as pg_trgm measures it:
 * `ilike` and `<%` are what the trigram indexes answer.
 */
function matchesTextOrTag(word: string): RawBuilder<boolean> {
  const pattern = sql`'%' || replace(replace(replace(search_text(${word}), '\\', '\\\\'), '%', '\\%'), '_', '\\_') || '%'`;
  const alike = (field: RawBuilder<unknown>) =>
    sql`(${field} ilike ${pattern} or search_text(${word}) <% ${field})`;
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
