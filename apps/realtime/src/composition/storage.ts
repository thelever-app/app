import type { AnalyticsEventRepository } from '@thelever-app/analytics';
import { InMemoryAnalyticsEventRepository } from '@thelever-app/analytics/in-memory';
import type { AcceptanceRepository, AnalyticsObjectionRepository } from '@thelever-app/consent';
import {
  InMemoryAcceptanceRepository,
  InMemoryAnalyticsObjectionRepository,
} from '@thelever-app/consent/in-memory';
import {
  type DatabaseClient,
  inTransaction,
  PostgresAcceptanceRepository,
  PostgresAnalyticsEventRepository,
  PostgresAnalyticsObjectionRepository,
  PostgresDataDeletionRepository,
  PostgresIssueRepository,
  PostgresModerationNoticeRepository,
  PostgresOutbox,
  PostgresFirstAccessRepository,
  PostgresDilemmaLikes,
  PostgresDilemmaQueries,
  PostgresDilemmaRepository,
  PostgresGameRepository,
  PostgresPlayerNotifier,
  PostgresRoomRepository,
  PostgresWorldResultRepository,
  type openListenClient,
} from '@thelever-app/db';
import type {
  DilemmaQueries,
  DilemmaRepository,
  WorldResultRepository,
} from '@thelever-app/dilemmas';
import {
  InMemoryDilemmaRepository,
  InMemoryWorldResultRepository,
} from '@thelever-app/dilemmas/in-memory';
import { loadSeedDilemmas } from '@thelever-app/dilemmas/seed';
import type {
  DilemmaLikes,
  GameRepository,
  PlayerNotifier,
  RoomRepository,
} from '@thelever-app/game';
import {
  InMemoryDilemmaLikes,
  InMemoryGameRepository,
  InMemoryRoomRepository,
} from '@thelever-app/game/in-memory';
import type { DataDeletionRepository, FirstAccessRepository } from '@thelever-app/identity';
import {
  InMemoryDataDeletionRepository,
  InMemoryFirstAccessRepository,
} from '@thelever-app/identity/in-memory';
import type { IssueRepository, ModerationNoticeRepository, Outbox } from '@thelever-app/moderation';
import {
  InMemoryIssueRepository,
  InMemoryModerationNoticeRepository,
  InMemoryOutbox,
} from '@thelever-app/moderation/in-memory';
import type { RunCommand } from '../rooms/run-command.ts';
import type { SocketNotifier } from '../rooms/sockets/socket-notifier.ts';

/** Where rooms, games and dilemmas live. */
export type Storage =
  /** In the memory of this instance, with the seed dilemmas: for the tests that need no database. */
  | { readonly kind: 'memory' }
  /** In PostgreSQL, shared by every instance, which tell each other what happens (ADR 0003). */
  | SharedStorage;

export interface SharedStorage {
  readonly kind: 'postgres';
  readonly db: DatabaseClient;
  readonly openListenClient: () => ReturnType<typeof openListenClient>;
  readonly instanceId: string;
  /** How often this instance gives a sign of life and looks for instances that died. */
  readonly beatEveryMs: number;
  /** How long without a sign before an instance is taken for dead and its connections closed. */
  readonly silentAfterMs: number;
}

/** The adapters behind the ports of the storage, and how a command runs on it. */
export interface StorageAdapters {
  readonly dilemmaRepository: DilemmaRepository;
  readonly dilemmaQueries: DilemmaQueries;
  readonly worldResults: WorldResultRepository;
  readonly roomRepository: RoomRepository;
  readonly gameRepository: GameRepository;
  /** The likes, which outlive the rooms. */
  readonly likes: DilemmaLikes;
  /** The first access of each identity, which outlives the rooms too. */
  readonly firstAccesses: FirstAccessRepository;
  /** The legal documents each identity accepted. */
  readonly acceptances: AcceptanceRepository;
  /** Who objects to product analytics. */
  readonly analyticsObjections: AnalyticsObjectionRepository;
  /** The facts of use of each identity. */
  readonly analyticsEvents: AnalyticsEventRepository;
  /** The deletions the deletion job does, and does again after a restore. */
  readonly dataDeletions: DataDeletionRepository;
  /** The issues of Moderation, with the reports and notices of each content. */
  readonly issues: IssueRepository;
  /** What the issues still have to tell the moderation repository, which the job sends. */
  readonly outbox: Outbox;
  /** The decisions that wait for each player to open the app. */
  readonly moderationNotices: ModerationNoticeRepository;
  /**
   * The notifier the use cases get, given the sockets of this instance: in memory, those sockets;
   * in PostgreSQL, every instance, which deliver to their own sockets what it publishes.
   */
  readonly notifierFor: (sockets: SocketNotifier) => PlayerNotifier;
  readonly runCommand: RunCommand;
}

export async function adaptersFor(storage: Storage): Promise<StorageAdapters> {
  if (storage.kind === 'memory') {
    const dilemmaRepository = new InMemoryDilemmaRepository();
    await loadSeedDilemmas(dilemmaRepository);
    return {
      dilemmaRepository,
      dilemmaQueries: dilemmaRepository,
      worldResults: new InMemoryWorldResultRepository(
        async (id) => (await dilemmaRepository.findById(id))?.version,
      ),
      roomRepository: new InMemoryRoomRepository(),
      gameRepository: new InMemoryGameRepository(),
      likes: new InMemoryDilemmaLikes(),
      firstAccesses: new InMemoryFirstAccessRepository(),
      acceptances: new InMemoryAcceptanceRepository(),
      analyticsObjections: new InMemoryAnalyticsObjectionRepository(),
      analyticsEvents: new InMemoryAnalyticsEventRepository(),
      dataDeletions: new InMemoryDataDeletionRepository(),
      issues: new InMemoryIssueRepository(),
      outbox: new InMemoryOutbox(),
      moderationNotices: new InMemoryModerationNoticeRepository(),
      notifierFor: (sockets) => sockets,
      runCommand: (command) => command(),
    };
  }
  // The dilemmas are loaded by the catalog-import job, not by each instance.
  const { db, instanceId } = storage;
  return {
    dilemmaRepository: new PostgresDilemmaRepository(db),
    dilemmaQueries: new PostgresDilemmaQueries(db),
    worldResults: new PostgresWorldResultRepository(db),
    roomRepository: new PostgresRoomRepository(db, instanceId),
    gameRepository: new PostgresGameRepository(db),
    likes: new PostgresDilemmaLikes(db),
    firstAccesses: new PostgresFirstAccessRepository(db),
    acceptances: new PostgresAcceptanceRepository(db),
    analyticsObjections: new PostgresAnalyticsObjectionRepository(db),
    analyticsEvents: new PostgresAnalyticsEventRepository(db),
    dataDeletions: new PostgresDataDeletionRepository(db),
    issues: new PostgresIssueRepository(db),
    outbox: new PostgresOutbox(db),
    moderationNotices: new PostgresModerationNoticeRepository(db),
    notifierFor: () => new PostgresPlayerNotifier(db),
    runCommand: (command) => inTransaction(db, command),
  };
}
