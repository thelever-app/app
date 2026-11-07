import {
  type DatabaseClient,
  inTransaction,
  PostgresDilemmaRepository,
  PostgresGameRepository,
  PostgresPlayerNotifier,
  PostgresRoomRepository,
  type openListenClient,
} from '@thelever-app/db';
import type { DilemmaRepository } from '@thelever-app/dilemmas';
import { InMemoryDilemmaRepository } from '@thelever-app/dilemmas/in-memory';
import { loadSeedDilemmas } from '@thelever-app/dilemmas/seed';
import type { GameRepository, PlayerNotifier, RoomRepository } from '@thelever-app/game';
import { InMemoryGameRepository, InMemoryRoomRepository } from '@thelever-app/game/in-memory';
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
  readonly roomRepository: RoomRepository;
  readonly gameRepository: GameRepository;
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
      roomRepository: new InMemoryRoomRepository(),
      gameRepository: new InMemoryGameRepository(),
      notifierFor: (sockets) => sockets,
      runCommand: (command) => command(),
    };
  }
  // The dilemmas are loaded by the migrate job, not by each instance.
  const { db, instanceId } = storage;
  return {
    dilemmaRepository: new PostgresDilemmaRepository(db),
    roomRepository: new PostgresRoomRepository(db, instanceId),
    gameRepository: new PostgresGameRepository(db),
    notifierFor: () => new PostgresPlayerNotifier(db),
    runCommand: (command) => inTransaction(db, command),
  };
}
