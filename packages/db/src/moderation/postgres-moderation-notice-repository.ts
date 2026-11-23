import {
  ModerationNotice,
  type ModerationNoticeRepository,
  type NoticeSubject,
} from '@thelever-app/moderation';
import type { Kysely, Selectable } from 'kysely';
import type { ModerationTables } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

/** The subject as JSON gives it back: the date of the report, as text, becomes a date again. */
function subjectOf(stored: Record<string, unknown>): NoticeSubject {
  const subject = stored as unknown as NoticeSubject;
  return subject.kind === 'report'
    ? { ...subject, reportedAt: new Date(subject.reportedAt as unknown as string) }
    : subject;
}

function noticeOf(row: Selectable<ModerationTables['moderation_notices']>): ModerationNotice {
  return ModerationNotice.fromSnapshot({
    id: row.id,
    identity: row.identity,
    subject: subjectOf(row.subject),
    outcome: row.outcome,
    rule: row.rule,
    decidedAt: row.decided_at,
    seenAt: row.seen_at,
  });
}

/** The moderation notices, one row each; only when it is seen does a notice change. */
export class PostgresModerationNoticeRepository implements ModerationNoticeRepository {
  readonly #db: Kysely<ModerationTables>;

  constructor(db: Kysely<ModerationTables>) {
    this.#db = db;
  }

  async save(notice: ModerationNotice): Promise<void> {
    const { id, identity, subject, outcome, rule, decidedAt, seenAt } = notice.toSnapshot();
    await (currentTransaction<ModerationTables>() ?? this.#db)
      .insertInto('moderation_notices')
      .values({
        id,
        identity,
        subject: JSON.stringify(subject),
        outcome,
        rule,
        decided_at: decidedAt,
        seen_at: seenAt,
      })
      .onConflict((conflict) => conflict.column('id').doUpdateSet({ seen_at: seenAt }))
      .execute();
  }

  async unseenOf(identity: string): Promise<ModerationNotice[]> {
    const rows = await (currentTransaction<ModerationTables>() ?? this.#db)
      .selectFrom('moderation_notices')
      .selectAll()
      .where('identity', '=', identity)
      .where('seen_at', 'is', null)
      .orderBy('decided_at')
      .orderBy('id')
      .execute();
    return rows.map(noticeOf);
  }

  async findById(id: string): Promise<ModerationNotice | undefined> {
    const row = await (currentTransaction<ModerationTables>() ?? this.#db)
      .selectFrom('moderation_notices')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row && noticeOf(row);
  }
}
