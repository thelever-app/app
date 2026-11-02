import {
  type Creator,
  Dilemma,
  type DilemmaRepository,
  type DilemmaSnapshot,
} from '@thelever-app/dilemmas';
import type { Kysely, Transaction } from 'kysely';
import type { Database } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

function creatorOf({
  creator_type,
  creator_identity,
}: Pick<Database['dilemmas'], 'creator_type' | 'creator_identity'>): Creator {
  if (creator_type === 'player') return { type: 'player', identity: creator_identity ?? '' };
  return { type: creator_type };
}

/** Each version in its own rows, inserted once; saving again only changes the status and the visibility. */
export class PostgresDilemmaRepository implements DilemmaRepository {
  readonly #db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.#db = db;
  }

  async save(dilemma: Dilemma): Promise<void> {
    const transaction = currentTransaction();
    if (transaction) return this.#save(transaction, dilemma.toSnapshot());
    await this.#db.transaction().execute((own) => this.#save(own, dilemma.toSnapshot()));
  }

  async findById(id: string): Promise<Dilemma | undefined> {
    const latest = await (currentTransaction() ?? this.#db)
      .selectFrom('dilemma_versions')
      .select('number')
      .where('dilemma_id', '=', id)
      .orderBy('number', 'desc')
      .limit(1)
      .executeTakeFirst();
    return latest && this.findVersion(id, latest.number);
  }

  async findVersion(id: string, version: number): Promise<Dilemma | undefined> {
    const db = currentTransaction() ?? this.#db;
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

  async #save(db: Transaction<Database>, snapshot: DilemmaSnapshot): Promise<void> {
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
