import type {
  AnalyticsEvent,
  AnalyticsEventKind,
  AnalyticsEventRepository,
} from '@thelever-app/analytics';
import type { Kysely } from 'kysely';
import type { AnalyticsTables } from '../schema.ts';
import { currentTransaction, withoutAbortingTheCommand } from '../transaction.ts';

/**
 * The analytics events, one row each, with what they tell as JSON. Recording one is part of a command
 * of the game, which goes on if it fails: it never aborts the transaction of the command.
 */
export class PostgresAnalyticsEventRepository implements AnalyticsEventRepository {
  readonly #db: Kysely<AnalyticsTables>;

  constructor(db: Kysely<AnalyticsTables>) {
    this.#db = db;
  }

  async record({ id, identity, occurredAt, fact }: AnalyticsEvent): Promise<void> {
    await withoutAbortingTheCommand(this.#db, (db) =>
      db
        .insertInto('analytics_events')
        .values({
          id,
          identity,
          kind: fact.kind,
          occurred_at: occurredAt,
          fact: JSON.stringify(fact),
        })
        .execute(),
    );
  }

  async ofIdentity(identity: string): Promise<AnalyticsEvent[]> {
    const rows = await (currentTransaction<AnalyticsTables>() ?? this.#db)
      .selectFrom('analytics_events')
      .selectAll()
      .where('identity', '=', identity)
      .orderBy('occurred_at')
      .orderBy('id')
      .execute();
    return rows.map(({ id, identity: owner, occurred_at, fact }) => ({
      id,
      identity: owner,
      occurredAt: occurred_at,
      fact,
    }));
  }

  async has(identity: string, kind: AnalyticsEventKind): Promise<boolean> {
    const row = await withoutAbortingTheCommand(this.#db, (db) =>
      db
        .selectFrom('analytics_events')
        .select('id')
        .where('identity', '=', identity)
        .where('kind', '=', kind)
        .executeTakeFirst(),
    );
    return row !== undefined;
  }

  async erase(identity: string): Promise<void> {
    await (currentTransaction<AnalyticsTables>() ?? this.#db)
      .deleteFrom('analytics_events')
      .where('identity', '=', identity)
      .execute();
  }
}
