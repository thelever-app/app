import type { DilemmaLike, DilemmaLikes } from '@thelever-app/game';
import type { Kysely } from 'kysely';
import type { GameTables } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

/**
 * The likes, one row per identity and dilemma, apart from the rooms so they outlive them. A like
 * given in a game takes the place of one given to the same dilemma from the catalog, which weighs
 * less, with its seal; another one in a game leaves it as it was.
 */
export class PostgresDilemmaLikes implements DilemmaLikes {
  readonly #db: Kysely<GameTables>;

  constructor(db: Kysely<GameTables>) {
    this.#db = db;
  }

  async like({ identity, dilemmaId, seal, at }: DilemmaLike): Promise<void> {
    const row = {
      given_in: 'game' as const,
      liked_at: at,
      game_consent_version: seal.gameConsentVersion,
      research_consent_version: seal.researchConsentVersion,
      commercial_licence_consent_version: seal.commercialLicenceConsentVersion,
      under_eighteen: seal.underEighteen,
    };
    await (currentTransaction<GameTables>() ?? this.#db)
      .insertInto('dilemma_likes')
      .values({ identity, dilemma_id: dilemmaId, ...row })
      .onConflict((conflict) =>
        conflict
          .columns(['identity', 'dilemma_id'])
          .doUpdateSet(row)
          .where('dilemma_likes.given_in', '=', 'catalog'),
      )
      .execute();
  }

  async unlike(identity: string, dilemmaId: string): Promise<void> {
    await (currentTransaction<GameTables>() ?? this.#db)
      .deleteFrom('dilemma_likes')
      .where('identity', '=', identity)
      .where('dilemma_id', '=', dilemmaId)
      .execute();
  }

  async hasLiked(identity: string, dilemmaId: string): Promise<boolean> {
    const found = await (currentTransaction<GameTables>() ?? this.#db)
      .selectFrom('dilemma_likes')
      .select('identity')
      .where('identity', '=', identity)
      .where('dilemma_id', '=', dilemmaId)
      .executeTakeFirst();
    return found !== undefined;
  }
}
