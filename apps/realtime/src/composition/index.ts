import { createServer, type Server } from 'node:http';
import type { Logger } from '@thelever-app/db';
import type { WebSocketServer } from 'ws';
import { createApp } from '../app.ts';
import { KeyedLock } from '../concurrency/keyed-lock.ts';
import { authentication } from '../http/authentication.ts';
import { httpErrorHandler } from '../http/error-handler.ts';
import { HealthEndpoint } from '../http/health.endpoint.ts';
import type { HttpEndpoint } from '../http/http-endpoint.ts';
import type { AccessGate } from '../identity/access-gate.ts';
import type { AppCheckVerifier } from '../identity/app-check-verifier.ts';
import type { TokenVerifier } from '../identity/token-verifier.ts';
import { CryptoRandomness } from '../rooms/crypto-randomness.ts';
import { errorCodeOf } from '../rooms/error-codes.ts';
import { CreateRoomEndpoint } from '../rooms/http/create-room.endpoint.ts';
import { JoinRoomEndpoint } from '../rooms/http/join-room.endpoint.ts';
import { RoomPreviewEndpoint } from '../rooms/http/room-preview.endpoint.ts';
import { SearchDilemmasEndpoint } from '../rooms/http/search-dilemmas.endpoint.ts';
import { RandomIdGenerator } from '../rooms/random-id-generator.ts';
import { SystemClock } from '../rooms/system-clock.ts';
import { RoundTimers } from '../rooms/round-timers.ts';
import { roundCommandHandlers } from '../rooms/sockets/round-commands.ts';
import { LeaveRoomHandler } from '../rooms/sockets/leave-room.handler.ts';
import { OwnStateCommandHandler } from '../rooms/sockets/own-state-command.handler.ts';
import type { RunCommand } from '../rooms/run-command.ts';
import { AnswerDilemmaHandler } from '../rooms/sockets/answer-dilemma.handler.ts';
import { ConnectHandler } from '../rooms/sockets/connect.handler.ts';
import { DisconnectHandler } from '../rooms/sockets/disconnect.handler.ts';
import { lobbyCommandHandlers } from '../rooms/sockets/lobby-commands.ts';
import { RoomSocketServer } from '../rooms/sockets/room-socket-server.ts';
import { SocketNotifier } from '../rooms/sockets/socket-notifier.ts';
import { StateSender } from '../rooms/sockets/state-sender.ts';
import { type Lifecycle, sharedLifecycle, type StopServing } from './shared-lifecycle.ts';
import { adaptersFor, type Storage } from './storage.ts';
import {
  dilemmaCatalog,
  type GameCommands,
  gameCommands,
  type GameQueries,
  gameQueries,
} from './use-cases.ts';

export type { Storage } from './storage.ts';

/** What changes between production and the tests. */
export interface RealtimeConfiguration {
  readonly tokenVerifier: TokenVerifier;
  /** Whether a call must prove it comes from the app: in dev and prod, not locally. */
  readonly appCheckVerifier: AppCheckVerifier;
  /** Whether entering a room asks for the access code: in dev and prod while they are closed. */
  readonly accessGate: AccessGate;
  readonly pingIntervalMs: number;
  readonly storage: Storage;
  readonly logger: Logger;
  /** The origins the web is served from: only those may read the answers of the HTTP routes. */
  readonly webOrigins: readonly string[];
}

/** The HTTP server, not listening yet, and the room sockets attached to it. */
export interface RealtimeServer extends Lifecycle {
  readonly http: Server;
  readonly sockets: WebSocketServer;
}

/**
 * Composition root of the room server: the only place that decides which adapter sits behind
 * each port and what each adapter receives.
 */
export async function composeRealtimeServer(
  configuration: RealtimeConfiguration,
): Promise<RealtimeServer> {
  const { storage, logger } = configuration;

  // 1. The adapters of the storage, and the dilemmas Game plays with.
  const { notifierFor, runCommand, ...repositories } = await adaptersFor(storage);
  const catalog = dilemmaCatalog(repositories.dilemmaRepository);

  // 2. The queries, and with them what sends each player the state of their room. One holder per
  // room at a time in this instance: its commands never interleave, and an event of the room
  // another instance published waits for the command in progress. Sending a game in its decision
  // phase sets the timer of its round in this instance.
  const clock = new SystemClock();
  const roomLock = new KeyedLock();
  const randomness = new CryptoRandomness();
  const queries = gameQueries({ ...repositories, catalog, randomness, clock });
  const timers = new RoundTimers(
    (roomId) => commands.runOutRound.execute({ roomId }),
    clock,
    roomLock,
    runCommand,
    logger,
  );
  const stateSender = new StateSender(
    queries.getRoomState,
    queries.getGameState,
    clock,
    (roomId, endsAt) => timers.schedule(roomId, endsAt),
  );
  const socketNotifier = new SocketNotifier(stateSender);

  // 3. The commands, which notify the players of what changed.
  const commands = gameCommands({
    ...repositories,
    catalog,
    notifier: notifierFor(socketNotifier),
    idGenerator: new RandomIdGenerator(),
    randomness,
    clock,
  });

  // 4. The HTTP routes and the room sockets on the same server.
  const http = createServer(
    createApp(httpEndpoints(commands, queries, roomLock, runCommand), {
      authenticate: authentication(
        configuration.tokenVerifier,
        configuration.appCheckVerifier,
        configuration.accessGate,
      ),
      errorHandler: httpErrorHandler(errorCodeOf),
      webOrigins: configuration.webOrigins,
    }),
  );
  const roomSockets = roomSocketServer(configuration, {
    commands,
    socketNotifier,
    stateSender,
    roomLock,
    runCommand,
  });
  const sockets = roomSockets.attach(http);

  // 5. How it stops: alone in memory; in PostgreSQL, among the other instances.
  const stopServing: StopServing = async (code, reason) => {
    timers.clear();
    roomSockets.leave(code, reason);
    await new Promise((resolve) => sockets.close(resolve));
    await new Promise((resolve) => http.close(resolve));
  };
  const lifecycle =
    storage.kind === 'memory'
      ? aloneLifecycle(stopServing)
      : await sharedLifecycle(storage, {
          roomSockets,
          socketNotifier,
          roomLock,
          disconnectConnections: commands.disconnectConnections,
          runCommand,
          logger,
          stopServing,
        });
  return { http, sockets, ...lifecycle };
}

function httpEndpoints(
  commands: GameCommands,
  queries: GameQueries,
  roomLock: KeyedLock,
  runCommand: RunCommand,
): HttpEndpoint[] {
  return [
    new HealthEndpoint(),
    new CreateRoomEndpoint(commands.createRoom, runCommand),
    new RoomPreviewEndpoint(queries.getRoomPreview),
    new JoinRoomEndpoint(commands.joinRoom, roomLock, runCommand),
    new SearchDilemmasEndpoint(queries.searchDilemmas),
  ];
}

/** What the handlers of the room sockets share. */
interface SocketParts {
  readonly commands: GameCommands;
  readonly socketNotifier: SocketNotifier;
  readonly stateSender: StateSender;
  readonly roomLock: KeyedLock;
  readonly runCommand: RunCommand;
}

function roomSocketServer(
  { tokenVerifier, appCheckVerifier, pingIntervalMs, logger }: RealtimeConfiguration,
  { commands, socketNotifier, stateSender, roomLock, runCommand }: SocketParts,
): RoomSocketServer {
  const disconnect = new DisconnectHandler(
    commands.disconnectPlayer,
    socketNotifier,
    roomLock,
    runCommand,
  );
  const handlers = [
    new ConnectHandler(
      commands.connectPlayer,
      tokenVerifier,
      appCheckVerifier,
      socketNotifier,
      roomLock,
      stateSender,
      disconnect,
      runCommand,
    ),
    new AnswerDilemmaHandler(commands.answerDilemma, roomLock, stateSender, runCommand),
    ...lobbyCommandHandlers(commands, roomLock, runCommand),
    ...roundCommandHandlers(commands, roomLock, runCommand),
    new LeaveRoomHandler(commands.leaveRoom, socketNotifier, roomLock, runCommand),
    new OwnStateCommandHandler(
      'report-dilemma',
      ({ dilemmaId, reason, comment }, { roomId, playerId }) =>
        commands.reportDilemma.execute({
          roomId,
          playerId,
          dilemmaId,
          reason,
          ...(comment !== undefined && { comment }),
        }),
      roomLock,
      stateSender,
      runCommand,
    ),
    new OwnStateCommandHandler(
      'skip-dilemma',
      ({ dilemmaId }, { roomId, playerId }) =>
        commands.skipDilemma.execute({ roomId, playerId, dilemmaId }),
      roomLock,
      stateSender,
      runCommand,
    ),
  ];
  return new RoomSocketServer(handlers, disconnect, errorCodeOf, pingIntervalMs, logger);
}

/** In memory there is nobody to tell: leaving cleanly is stopping. */
function aloneLifecycle(stopServing: StopServing): Lifecycle {
  const close = () => stopServing(1001, 'going away');
  return { shutdown: close, close };
}
