import { createServer, type Server } from 'node:http';
import { type Attributes, SpanKind } from '@opentelemetry/api';
import {
  type DatabaseClient,
  GameEventsListener,
  type Logger,
  inTransaction,
  PostgresDilemmaRepository,
  PostgresGameRepository,
  PostgresInstances,
  PostgresPlayerNotifier,
  PostgresRoomRepository,
  type openListenClient,
} from '@thelever-app/db';
import { type DilemmaRepository, GetDilemmasUseCase } from '@thelever-app/dilemmas';
import { InMemoryDilemmaRepository } from '@thelever-app/dilemmas/in-memory';
import { loadSeedDilemmas } from '@thelever-app/dilemmas/seed';
import {
  AnswerDilemmaUseCase,
  ConnectPlayerUseCase,
  CreateRoomUseCase,
  DisconnectConnectionsUseCase,
  DisconnectPlayerUseCase,
  type DomainEvent,
  type GameRepository,
  GetGameStateUseCase,
  JoinRoomUseCase,
  type PlayerNotifier,
  type DilemmaCatalog,
  type IdGenerator,
  type RoomRepository,
  StartDecisionPhaseUseCase,
} from '@thelever-app/game';
import { DilemmasContextCatalog } from '@thelever-app/game/dilemmas';
import {
  InMemoryGameRepository,
  InMemoryRoomRepository,
  InMemorySealProvider,
} from '@thelever-app/game/in-memory';
import type { WebSocketServer } from 'ws';
import { createApp } from './app.ts';
import { KeyedLock } from './concurrency/keyed-lock.ts';
import { authentication } from './http/authentication.ts';
import { httpErrorHandler } from './http/error-handler.ts';
import { HealthEndpoint } from './http/health.endpoint.ts';
import type { HttpEndpoint } from './http/http-endpoint.ts';
import type { AppCheckVerifier } from './identity/app-check-verifier.ts';
import type { TokenVerifier } from './identity/token-verifier.ts';
import { errorCodeOf } from './rooms/error-codes.ts';
import { CreateRoomEndpoint } from './rooms/http/create-room.endpoint.ts';
import { JoinRoomEndpoint } from './rooms/http/join-room.endpoint.ts';
import { StartGameEndpoint } from './rooms/http/start-game.endpoint.ts';
import { InstanceKeeper } from './rooms/instance-keeper.ts';
import { RandomIdGenerator } from './rooms/random-id-generator.ts';
import type { RunCommand } from './rooms/run-command.ts';
import { AnswerDilemmaHandler } from './rooms/sockets/answer-dilemma.handler.ts';
import { ConnectHandler } from './rooms/sockets/connect.handler.ts';
import { DisconnectHandler } from './rooms/sockets/disconnect.handler.ts';
import { GameStateSender } from './rooms/sockets/game-state-sender.ts';
import { RoomSocketServer } from './rooms/sockets/room-socket-server.ts';
import { SocketNotifier } from './rooms/sockets/socket-notifier.ts';
import { GAME_ID } from './telemetry/game-sampler.ts';
import { instruments } from './telemetry/instruments.ts';
import { inSpan } from './telemetry/tracing.ts';

/** Where rooms, games and dilemmas live. */
export type Storage =
  /** In the memory of this instance, with the seed dilemmas: for the tests that need no database. */
  | { readonly kind: 'memory' }
  /** In PostgreSQL, shared by every instance, which tell each other what happens (ADR 0003). */
  | {
      readonly kind: 'postgres';
      readonly db: DatabaseClient;
      readonly openListenClient: () => ReturnType<typeof openListenClient>;
      readonly instanceId: string;
      /** How often this instance gives a sign of life and looks for instances that died. */
      readonly beatEveryMs: number;
      /** How long without a sign before an instance is taken for dead and its connections closed. */
      readonly silentAfterMs: number;
    };

/** What changes between production and the tests. */
export interface RealtimeConfiguration {
  readonly tokenVerifier: TokenVerifier;
  /** Whether a call must prove it comes from the app: in dev and prod, not locally. */
  readonly appCheckVerifier: AppCheckVerifier;
  readonly pingIntervalMs: number;
  readonly storage: Storage;
  readonly logger: Logger;
}

/** The HTTP server, not listening yet, and the room sockets attached to it. */
export interface RealtimeServer {
  readonly http: Server;
  readonly sockets: WebSocketServer;
  /** For SIGTERM: leaves cleanly, with the connections of this instance closed for everyone. */
  readonly shutdown: () => Promise<void>;
  /** Stops at once, as a process that dies would, without telling anyone. */
  readonly close: () => Promise<void>;
}

/** The adapters behind the ports, and how a command runs, for each storage. */
interface Adapters {
  readonly dilemmaRepository: DilemmaRepository;
  readonly roomRepository: RoomRepository;
  readonly gameRepository: GameRepository;
  /** The notifier the use cases get: the sockets of this instance, or every instance through PostgreSQL. */
  readonly notifier: PlayerNotifier;
  readonly runCommand: RunCommand;
}

/** What the HTTP routes and the sockets are both built from. */
interface Parts extends Adapters {
  readonly catalog: DilemmaCatalog;
  readonly idGenerator: IdGenerator;
  readonly tokenVerifier: TokenVerifier;
  readonly appCheckVerifier: AppCheckVerifier;
  /** Delivers to the sockets of this instance. */
  readonly socketNotifier: SocketNotifier;
  readonly stateSender: GameStateSender;
  readonly logger: Logger;
}

/** How the server stops, the same for every storage. */
type Lifecycle = Pick<RealtimeServer, 'shutdown' | 'close'>;

/** Stops serving: closes every socket with that code, without disconnecting anyone, and the HTTP server. */
type StopServing = (code: number, reason: string) => Promise<void>;

async function adaptersFor(storage: Storage, sockets: SocketNotifier): Promise<Adapters> {
  if (storage.kind === 'memory') {
    const dilemmaRepository = new InMemoryDilemmaRepository();
    await loadSeedDilemmas(dilemmaRepository);
    return {
      dilemmaRepository,
      roomRepository: new InMemoryRoomRepository(),
      gameRepository: new InMemoryGameRepository(),
      notifier: sockets,
      runCommand: (command) => command(),
    };
  }
  // The dilemmas are loaded by the migrate job, not by each instance.
  const { db, instanceId } = storage;
  return {
    dilemmaRepository: new PostgresDilemmaRepository(db),
    roomRepository: new PostgresRoomRepository(db, instanceId),
    gameRepository: new PostgresGameRepository(db),
    notifier: new PostgresPlayerNotifier(db),
    runCommand: (command) => inTransaction(db, command),
  };
}

function httpEndpoints({
  roomRepository,
  gameRepository,
  catalog,
  idGenerator,
  runCommand,
}: Parts): HttpEndpoint[] {
  return [
    new HealthEndpoint(),
    new CreateRoomEndpoint(new CreateRoomUseCase(roomRepository, idGenerator), runCommand),
    new JoinRoomEndpoint(new JoinRoomUseCase(roomRepository, idGenerator), runCommand),
    new StartGameEndpoint(
      new StartDecisionPhaseUseCase(roomRepository, gameRepository, catalog, idGenerator),
      runCommand,
    ),
  ];
}

function roomSocketServer(parts: Parts, pingIntervalMs: number): RoomSocketServer {
  const { roomRepository, gameRepository, notifier, socketNotifier, stateSender, runCommand } =
    parts;
  // One holder per game at a time, so its commands never interleave in this instance.
  const gameLock = new KeyedLock();
  const disconnectHandler = new DisconnectHandler(
    new DisconnectPlayerUseCase(roomRepository, gameRepository, notifier),
    socketNotifier,
    gameLock,
    runCommand,
  );
  const handlers = [
    new ConnectHandler(
      new ConnectPlayerUseCase(roomRepository, gameRepository, notifier, parts.idGenerator),
      parts.tokenVerifier,
      parts.appCheckVerifier,
      socketNotifier,
      gameLock,
      stateSender,
      disconnectHandler,
      runCommand,
    ),
    new AnswerDilemmaHandler(
      // Until the first access exists, every answer carries the seal of before it.
      new AnswerDilemmaUseCase(
        roomRepository,
        gameRepository,
        notifier,
        new InMemorySealProvider(),
      ),
      gameLock,
      stateSender,
      runCommand,
    ),
  ];
  return new RoomSocketServer(
    handlers,
    disconnectHandler,
    errorCodeOf,
    pingIntervalMs,
    parts.logger,
  );
}

/** What a delivery span says: the event, its game or room, and how many players it is for. */
function deliveryAttributes(playerIds: readonly string[], event: DomainEvent): Attributes {
  return {
    'event.type': event.type,
    'event.recipients': playerIds.length,
    [GAME_ID]: 'gameId' in event ? String(event.gameId) : undefined,
    'room.id': 'roomId' in event ? String(event.roomId) : undefined,
  };
}

/** In memory there is nobody to tell: leaving cleanly is stopping. */
function aloneLifecycle(stopServing: StopServing): Lifecycle {
  const close = () => stopServing(1001, 'going away');
  return { shutdown: close, close };
}

/**
 * Joins the other instances: delivers to its own sockets what they publish, keeps itself seen alive
 * and cleans after the ones that die.
 */
async function sharedLifecycle(
  storage: Extract<Storage, { kind: 'postgres' }>,
  parts: Parts,
  roomSockets: RoomSocketServer,
  stopServing: StopServing,
): Promise<Lifecycle> {
  const { socketNotifier, stateSender, logger } = parts;
  const listener = new GameEventsListener(storage.openListenClient, {
    // One span per instance that delivers, not per player: a room of 50 would make 50 spans.
    onEvents: (playerIds, event, publishedAt) => {
      inSpan(
        'deliver game event',
        deliveryAttributes(playerIds, event),
        () => socketNotifier.notify(playerIds, event),
        { kind: SpanKind.CONSUMER },
      ).then(
        () => {
          if (publishedAt === undefined) return;
          instruments().eventDelay.record(Date.now() - publishedAt, { 'event.type': event.type });
        },
        (error: unknown) => {
          logger.error('delivering a game event failed', error, { event: event.type });
        },
      );
    },
    // Whatever was published while it was not listening is lost: a fresh state makes up for it.
    onReconnected: () => {
      for (const connection of roomSockets.connected()) {
        if (connection.session) {
          stateSender.send(connection, connection.session).catch((error: unknown) => {
            logger.error('sending the game state after listening again failed', error);
          });
        }
      }
    },
    logger,
  });
  await listener.start();
  const keeper = new InstanceKeeper(
    new PostgresInstances(storage.db),
    new DisconnectConnectionsUseCase(parts.roomRepository, parts.notifier),
    parts.runCommand,
    {
      instanceId: storage.instanceId,
      beatEveryMs: storage.beatEveryMs,
      silentAfterMs: storage.silentAfterMs,
      // The clients come back and connect again, now that the instance is registered again.
      onForgotten: () => roomSockets.closeAll(1012, 'service restart'),
      logger,
    },
  );
  await keeper.start();

  return {
    close: async () => {
      keeper.stop();
      await listener.stop();
      await stopServing(1001, 'going away');
    },
    shutdown: async () => {
      keeper.stop();
      // The clients come back on another instance: 1012 is "service restart".
      const stopping = stopServing(1012, 'service restart');
      await keeper.leave();
      await listener.stop();
      await stopping;
    },
  };
}

/**
 * Composition root of the room server: the only place that decides which adapter sits behind
 * each port and what each adapter receives.
 */
export async function composeRealtimeServer({
  tokenVerifier,
  appCheckVerifier,
  pingIntervalMs,
  storage,
  logger,
}: RealtimeConfiguration): Promise<RealtimeServer> {
  const socketNotifier = new SocketNotifier();
  const adapters = await adaptersFor(storage, socketNotifier);
  const catalog = new DilemmasContextCatalog(new GetDilemmasUseCase(adapters.dilemmaRepository));
  const parts: Parts = {
    ...adapters,
    catalog,
    idGenerator: new RandomIdGenerator(),
    tokenVerifier,
    appCheckVerifier,
    socketNotifier,
    logger,
    stateSender: new GameStateSender(
      new GetGameStateUseCase(adapters.roomRepository, adapters.gameRepository, catalog),
    ),
  };

  const http = createServer(
    createApp(httpEndpoints(parts), {
      authenticate: authentication(tokenVerifier, appCheckVerifier),
      errorHandler: httpErrorHandler(errorCodeOf),
    }),
  );
  const roomSockets = roomSocketServer(parts, pingIntervalMs);
  const sockets = roomSockets.attach(http);
  const stopServing: StopServing = async (code, reason) => {
    roomSockets.leave(code, reason);
    await new Promise((resolve) => sockets.close(resolve));
    await new Promise((resolve) => http.close(resolve));
  };

  const lifecycle =
    storage.kind === 'memory'
      ? aloneLifecycle(stopServing)
      : await sharedLifecycle(storage, parts, roomSockets, stopServing);
  return { http, sockets, ...lifecycle };
}
