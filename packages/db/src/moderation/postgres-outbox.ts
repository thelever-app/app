import type { IssueEvent, Outbox, PendingEvent } from '@thelever-app/moderation';
import type { Kysely } from 'kysely';
import type { ModerationTables } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

/**
 * The outbox of Moderation: written in the transaction of the command that changed the issue, and
 * emptied by the job as each event reaches where it goes. A sent event is deleted: an email
 * address of a notice is never copied here, only the notice it belongs to.
 */
export class PostgresOutbox implements Outbox {
  readonly #db: Kysely<ModerationTables>;

  constructor(db: Kysely<ModerationTables>) {
    this.#db = db;
  }

  async add(issueId: string, events: readonly IssueEvent[]): Promise<void> {
    if (events.length === 0) return;
    await (currentTransaction<ModerationTables>() ?? this.#db)
      .insertInto('moderation_outbox')
      .values(events.map((event) => ({ issue_id: issueId, event: JSON.stringify(event) })))
      .execute();
  }

  async pending(): Promise<PendingEvent[]> {
    const rows = await (currentTransaction<ModerationTables>() ?? this.#db)
      .selectFrom('moderation_outbox')
      .selectAll()
      .orderBy('id')
      .execute();
    return rows.map(({ id, issue_id, event }) => ({ id: Number(id), issueId: issue_id, event }));
  }

  async sent(id: number): Promise<void> {
    await (currentTransaction<ModerationTables>() ?? this.#db)
      .deleteFrom('moderation_outbox')
      .where('id', '=', String(id))
      .execute();
  }
}
