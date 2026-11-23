import {
  Issue,
  type IssueContent,
  type IssueRepository,
  type IssueSnapshot,
} from '@thelever-app/moderation';
import type { Kysely, Selectable, Transaction } from 'kysely';
import type { ModerationTables } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

type IssueRow = Selectable<ModerationTables['moderation_issues']>;

function contentOf(row: IssueRow): IssueContent {
  switch (row.content_kind) {
    case 'dilemma':
      return { kind: 'dilemma', dilemmaId: row.dilemma_id! };
    case 'nickname':
      return { kind: 'nickname', nickname: row.nickname!, owner: row.nickname_owner! };
    case 'reference':
      return { kind: 'reference', reference: row.reference! };
  }
}

/**
 * The issues, one row each, with their reports and notices in tables of their own. Saved in the
 * transaction of the command, with the outbox, so what the issue still has to tell is never lost
 * nor told twice. Nothing of an issue is ever deleted here: it is kept 3 years.
 */
export class PostgresIssueRepository implements IssueRepository {
  readonly #db: Kysely<ModerationTables>;

  constructor(db: Kysely<ModerationTables>) {
    this.#db = db;
  }

  async save(issue: Issue): Promise<void> {
    const transaction = currentTransaction<ModerationTables>();
    if (transaction) await this.#save(transaction, issue.toSnapshot());
    else await this.#db.transaction().execute((trx) => this.#save(trx, issue.toSnapshot()));
  }

  async findById(id: string): Promise<Issue | undefined> {
    const [issue] = await this.#issues({ id });
    return issue;
  }

  async undecidedOf(content: IssueContent): Promise<Issue | undefined> {
    if (content.kind === 'reference') return undefined;
    const [issue] = await this.#issues({ undecided: true, content });
    return issue;
  }

  async undecidedInRepository(): Promise<Issue[]> {
    return this.#issues({ undecided: true, numbered: true });
  }

  async noticesSentSince(identity: string, since: Date): Promise<number> {
    const { count } = await (currentTransaction<ModerationTables>() ?? this.#db)
      .selectFrom('illegal_content_notices')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .where('identity', '=', identity)
      .where('sent_at', '>=', since)
      .executeTakeFirstOrThrow();
    return Number(count);
  }

  /** The issues that match, the oldest first, each with its reports and notices. */
  async #issues(filter: {
    readonly id?: string;
    readonly undecided?: boolean;
    readonly numbered?: boolean;
    readonly content?: Exclude<IssueContent, { kind: 'reference' }>;
  }): Promise<Issue[]> {
    const db = currentTransaction<ModerationTables>() ?? this.#db;
    let query = db.selectFrom('moderation_issues').selectAll();
    if (filter.id !== undefined) query = query.where('id', '=', filter.id);
    if (filter.undecided) query = query.where('outcome', 'is', null);
    if (filter.numbered) query = query.where('number', 'is not', null);
    const { content } = filter;
    if (content?.kind === 'dilemma') {
      query = query
        .where('content_kind', '=', 'dilemma')
        .where('dilemma_id', '=', content.dilemmaId);
    } else if (content?.kind === 'nickname') {
      query = query
        .where('content_kind', '=', 'nickname')
        .where('nickname', '=', content.nickname)
        .where('nickname_owner', '=', content.owner);
    }
    const rows = await query.orderBy('opened_at').orderBy('id').execute();
    if (rows.length === 0) return [];
    const ids = rows.map(({ id }) => id);
    const [dilemmaReports, nicknameReports, notices] = await Promise.all([
      db
        .selectFrom('dilemma_reports')
        .selectAll()
        .where('issue_id', 'in', ids)
        .orderBy('reported_at')
        .orderBy('id')
        .execute(),
      db
        .selectFrom('nickname_reports')
        .selectAll()
        .where('issue_id', 'in', ids)
        .orderBy('reported_at')
        .orderBy('id')
        .execute(),
      db
        .selectFrom('illegal_content_notices')
        .selectAll()
        .where('issue_id', 'in', ids)
        .orderBy('sent_at')
        .orderBy('id')
        .execute(),
    ]);
    return rows.map((row) =>
      Issue.fromSnapshot({
        id: row.id,
        content: contentOf(row),
        number: row.number,
        openedAt: row.opened_at,
        hidden: row.hidden,
        decision:
          row.outcome === null
            ? null
            : {
                outcome: row.outcome,
                facts: row.facts!,
                translatedFacts: row.translated_facts!,
                rule: row.rule!,
                decidedAt: row.decided_at!,
              },
        dilemmaReports: dilemmaReports
          .filter(({ issue_id }) => issue_id === row.id)
          .map((report) => ({
            id: report.id,
            dilemmaId: report.dilemma_id,
            version: report.version,
            reason: report.reason,
            comment: report.comment,
            language: report.language,
            identity: report.identity,
            reportedAt: report.reported_at,
          })),
        nicknameReports: nicknameReports
          .filter(({ issue_id }) => issue_id === row.id)
          .map((report) => ({
            id: report.id,
            nickname: report.nickname,
            owner: report.owner,
            reason: report.reason,
            comment: report.comment,
            identity: report.identity,
            reportedAt: report.reported_at,
          })),
        notices: notices
          .filter(({ issue_id }) => issue_id === row.id)
          .map((notice) => ({
            id: notice.id,
            reference: notice.reference,
            explanation: notice.explanation,
            name: notice.name,
            email: notice.email,
            language: notice.language,
            identity: notice.identity,
            sentAt: notice.sent_at,
          })),
      }),
    );
  }

  async #save(db: Transaction<ModerationTables>, snapshot: IssueSnapshot): Promise<void> {
    const { id, content, decision } = snapshot;
    const changing = {
      number: snapshot.number,
      hidden: snapshot.hidden,
      outcome: decision?.outcome ?? null,
      facts: decision?.facts ?? null,
      translated_facts: decision ? JSON.stringify(decision.translatedFacts) : null,
      rule: decision?.rule ?? null,
      decided_at: decision?.decidedAt ?? null,
    };
    await db
      .insertInto('moderation_issues')
      .values({
        id,
        content_kind: content.kind,
        dilemma_id: content.kind === 'dilemma' ? content.dilemmaId : null,
        nickname: content.kind === 'nickname' ? content.nickname : null,
        nickname_owner: content.kind === 'nickname' ? content.owner : null,
        reference: content.kind === 'reference' ? content.reference : null,
        opened_at: snapshot.openedAt,
        ...changing,
      })
      .onConflict((conflict) => conflict.column('id').doUpdateSet(changing))
      .execute();
    // Reports and notices never change: only the new ones are added.
    if (snapshot.dilemmaReports.length > 0) {
      await db
        .insertInto('dilemma_reports')
        .values(
          snapshot.dilemmaReports.map((report) => ({
            id: report.id,
            issue_id: id,
            dilemma_id: report.dilemmaId,
            version: report.version,
            reason: report.reason,
            comment: report.comment,
            language: report.language,
            identity: report.identity,
            reported_at: report.reportedAt,
          })),
        )
        .onConflict((conflict) => conflict.column('id').doNothing())
        .execute();
    }
    if (snapshot.nicknameReports.length > 0) {
      await db
        .insertInto('nickname_reports')
        .values(
          snapshot.nicknameReports.map((report) => ({
            id: report.id,
            issue_id: id,
            nickname: report.nickname,
            owner: report.owner,
            reason: report.reason,
            comment: report.comment,
            identity: report.identity,
            reported_at: report.reportedAt,
          })),
        )
        .onConflict((conflict) => conflict.column('id').doNothing())
        .execute();
    }
    if (snapshot.notices.length > 0) {
      await db
        .insertInto('illegal_content_notices')
        .values(
          snapshot.notices.map((notice) => ({
            id: notice.id,
            issue_id: id,
            reference: notice.reference,
            explanation: notice.explanation,
            name: notice.name,
            email: notice.email,
            language: notice.language,
            identity: notice.identity,
            sent_at: notice.sentAt,
          })),
        )
        .onConflict((conflict) => conflict.column('id').doNothing())
        .execute();
    }
  }
}
