import { DilemmaReport, type DilemmaReportRepository } from '@thelever-app/moderation';
import type { Kysely } from 'kysely';
import type { ModerationTables } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

/**
 * The reports of dilemmas, one row each. Saved in the transaction of the command that makes the
 * report, so a report is kept or lost with the game it was made in.
 */
export class PostgresDilemmaReportRepository implements DilemmaReportRepository {
  readonly #db: Kysely<ModerationTables>;

  constructor(db: Kysely<ModerationTables>) {
    this.#db = db;
  }

  async save(report: DilemmaReport): Promise<void> {
    const { id, dilemmaId, version, reason, comment, identity, reportedAt } = report.toSnapshot();
    await (currentTransaction<ModerationTables>() ?? this.#db)
      .insertInto('dilemma_reports')
      .values({
        id,
        dilemma_id: dilemmaId,
        version,
        reason,
        comment,
        identity,
        reported_at: reportedAt,
      })
      .execute();
  }

  async reportsOf(dilemmaId: string): Promise<DilemmaReport[]> {
    const rows = await (currentTransaction<ModerationTables>() ?? this.#db)
      .selectFrom('dilemma_reports')
      .selectAll()
      .where('dilemma_id', '=', dilemmaId)
      .orderBy('reported_at')
      .orderBy('id')
      .execute();
    return rows.map((row) =>
      DilemmaReport.fromSnapshot({
        id: row.id,
        dilemmaId: row.dilemma_id,
        version: row.version,
        reason: row.reason,
        comment: row.comment,
        identity: row.identity,
        reportedAt: row.reported_at,
      }),
    );
  }
}
