import type { InMemoryDilemmaCatalog, InMemoryDilemmaStatus } from '@thelever-app/game/in-memory';
import {
  GetModerationNoticesUseCase,
  GetUndecidedIssuesUseCase,
  type ModeratedDilemmas,
  ReadDecisionUseCase,
  ReceiveDilemmaReportUseCase,
  ReceiveIllegalContentNoticeUseCase,
  ReceiveNicknameReportUseCase,
  SeeModerationNoticeUseCase,
  SendIssueEventUseCase,
} from '@thelever-app/moderation';
import {
  InMemoryIssueRepository,
  InMemoryIssueTracker,
  InMemoryMailer,
  InMemoryModerationNoticeRepository,
  InMemoryOutbox,
  LanguageTagFactsTranslator,
} from '@thelever-app/moderation/in-memory';
import type {
  IssueRepository,
  ModeratedNicknames,
  ModerationNoticeRepository,
  Outbox,
} from '@thelever-app/moderation';

/** Test data: what the team writes when it closes an issue, the facts and the rule. */
export const TEAM_REASONS =
  'Hechos: Lo hemos revisado y el contenido no cumple las normas.\nRegla: 4.2';
/** Test data: the section of the terms of use the team applies. */
export const TEAM_RULE = '4.2';

/**
 * The dilemmas of the tests as Moderation sees them, in the catalog Game plays from in the
 * application: a link of the public web points to the dilemma of the tests of that number.
 */
export class ModerationOfTheTestCatalog implements ModeratedDilemmas {
  readonly #catalog: InMemoryDilemmaCatalog;
  readonly #ids: readonly string[];
  readonly #texts: ReadonlyMap<string, string>;
  readonly #before = new Map<string, InMemoryDilemmaStatus>();

  constructor(
    catalog: InMemoryDilemmaCatalog,
    dilemmas: readonly { readonly dilemmaId: string; readonly text: string }[],
  ) {
    this.#catalog = catalog;
    this.#ids = dilemmas.map(({ dilemmaId }) => dilemmaId);
    this.#texts = new Map(dilemmas.map(({ dilemmaId, text }) => [dilemmaId, text]));
  }

  /** The link of the public web to that dilemma of the tests, as a person would paste it. */
  linkTo(dilemmaId: string): string {
    return `https://thelever.test/es/test/dilema-${this.#ids.indexOf(dilemmaId) + 1}`;
  }

  async dilemmaOf(reference: string): Promise<string | null> {
    const number = /-(\d+)$/.exec(reference.trim())?.[1];
    return (number && this.#ids[Number(number) - 1]) || null;
  }

  /** Each dilemma of the tests is a family of its own: they have no translations. */
  async familyOf(dilemmaId: string): Promise<readonly string[]> {
    return [dilemmaId];
  }

  async textOf(dilemmaId: string): Promise<string | null> {
    return this.#texts.get(dilemmaId) ?? null;
  }

  async hide(dilemmaId: string): Promise<void> {
    if (this.#before.has(dilemmaId)) return;
    this.#before.set(dilemmaId, this.#catalog.statusOf(dilemmaId));
    this.#catalog.changeStatus(dilemmaId, 'hidden-by-reports');
  }

  async restore(dilemmaId: string): Promise<void> {
    const before = this.#before.get(dilemmaId);
    if (before === undefined) return;
    this.#before.delete(dilemmaId);
    this.#catalog.changeStatus(dilemmaId, before);
  }

  async withdraw(dilemmaId: string): Promise<void> {
    this.#catalog.changeStatus(dilemmaId, 'withdrawn');
  }
}

/** Where Moderation keeps what it receives: in memory unless the test gives its database. */
export interface ModerationStorage {
  readonly issues: IssueRepository;
  readonly outbox: Outbox;
  readonly notices: ModerationNoticeRepository;
}

/**
 * The Moderation context with a fake repository, inbox and translator, on the storage given or in
 * memory. Each event and each decision of the job runs through `runCommand`.
 */
export function moderationInMemory({
  dilemmas,
  nicknames,
  idPrefix = 'moderation',
  clock,
  storage,
  tracker = new InMemoryIssueTracker(),
  mailer = new InMemoryMailer(),
  runCommand = (command) => command(),
}: {
  readonly dilemmas: ModeratedDilemmas;
  readonly nicknames: ModeratedNicknames;
  readonly idPrefix?: string;
  readonly clock: { now(): Date };
  readonly storage?: ModerationStorage;
  readonly tracker?: InMemoryIssueTracker;
  readonly mailer?: InMemoryMailer;
  readonly runCommand?: <T>(command: () => Promise<T>) => Promise<T>;
}) {
  let next = 1;
  const idGenerator = { generate: () => `${idPrefix}-${next++}` };
  const issues = storage?.issues ?? new InMemoryIssueRepository();
  const outbox = storage?.outbox ?? new InMemoryOutbox();
  const notices = storage?.notices ?? new InMemoryModerationNoticeRepository();
  const ports = { issues, outbox, dilemmas, nicknames, idGenerator, clock };
  const send = new SendIssueEventUseCase({ issues, outbox, tracker, mailer, dilemmas });
  const read = new ReadDecisionUseCase({
    issues,
    outbox,
    tracker,
    dilemmas,
    nicknames,
    notices,
    translator: new LanguageTagFactsTranslator(),
    idGenerator,
    clock,
  });
  const undecided = new GetUndecidedIssuesUseCase(issues);
  return {
    issues,
    tracker,
    mailer,
    receiveDilemmaReport: new ReceiveDilemmaReportUseCase(ports),
    receiveNicknameReport: new ReceiveNicknameReportUseCase(ports),
    receiveIllegalContentNotice: new ReceiveIllegalContentNoticeUseCase(ports),
    getNotices: new GetModerationNoticesUseCase(notices),
    seeNotice: new SeeModerationNoticeUseCase(notices, clock),
    /** One run of the job: the outbox, the decisions, and the outbox again for their emails. */
    async sync(): Promise<void> {
      while (await runCommand(() => send.execute())) {
        // One more event.
      }
      for (const issueId of await undecided.execute()) {
        await runCommand(() => read.execute(issueId));
      }
      while (await runCommand(() => send.execute())) {
        // One more event.
      }
    },
  };
}
