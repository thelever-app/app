import { createServer, type Server } from 'node:http';
import { GetDilemmasUseCase } from '@thelever-app/dilemmas';
import { InMemoryDilemmaRepository } from '@thelever-app/dilemmas/in-memory';
import { loadSeedDilemmas } from '@thelever-app/dilemmas/seed';
import {
  AnswerDilemmaUseCase,
  ConnectPlayerUseCase,
  CreateRoomUseCase,
  DisconnectPlayerUseCase,
  GetGameStateUseCase,
  JoinRoomUseCase,
  StartDecisionPhaseUseCase,
} from '@thelever-app/game';
import { DilemmasContextCatalog } from '@thelever-app/game/dilemmas';
import { InMemoryGameRepository, InMemoryRoomRepository } from '@thelever-app/game/in-memory';
import type { WebSocketServer } from 'ws';
import { createApp } from './app.ts';
import { KeyedLock } from './concurrency/keyed-lock.ts';
import { authentication } from './http/authentication.ts';
import { httpErrorHandler } from './http/error-handler.ts';
import { HealthEndpoint } from './http/health.endpoint.ts';
import type { TokenVerifier } from './identity/token-verifier.ts';
import { errorCodeOf } from './rooms/error-codes.ts';
import { CreateRoomEndpoint } from './rooms/http/create-room.endpoint.ts';
import { JoinRoomEndpoint } from './rooms/http/join-room.endpoint.ts';
import { StartGameEndpoint } from './rooms/http/start-game.endpoint.ts';
import { RandomIdGenerator } from './rooms/random-id-generator.ts';
import { AnswerDilemmaHandler } from './rooms/sockets/answer-dilemma.handler.ts';
import { ConnectHandler } from './rooms/sockets/connect.handler.ts';
import { DisconnectHandler } from './rooms/sockets/disconnect.handler.ts';
import { GameStateSender } from './rooms/sockets/game-state-sender.ts';
import { RoomSocketServer } from './rooms/sockets/room-socket-server.ts';
import { SocketNotifier } from './rooms/sockets/socket-notifier.ts';

/** What changes between production and the tests. */
export interface RealtimeConfiguration {
  readonly tokenVerifier: TokenVerifier;
  readonly pingIntervalMs: number;
}

/** The HTTP server, not listening yet, and the room sockets attached to it. */
export interface RealtimeServer {
  readonly http: Server;
  readonly sockets: WebSocketServer;
}

/**
 * Composition root of the room server: the only place that decides which adapter sits behind
 * each port and what each adapter receives. Rooms, games and dilemmas live in the memory of this
 * instance; the dilemmas are the seed ones.
 */
export async function composeRealtimeServer({
  tokenVerifier,
  pingIntervalMs,
}: RealtimeConfiguration): Promise<RealtimeServer> {
  // Dilemmas
  const dilemmaRepository = new InMemoryDilemmaRepository();
  await loadSeedDilemmas(dilemmaRepository);
  const catalog = new DilemmasContextCatalog(new GetDilemmasUseCase(dilemmaRepository));

  // Game
  const roomRepository = new InMemoryRoomRepository();
  const gameRepository = new InMemoryGameRepository();
  const idGenerator = new RandomIdGenerator();
  const notifier = new SocketNotifier();

  // HTTP
  const endpoints = [
    new HealthEndpoint(),
    new CreateRoomEndpoint(new CreateRoomUseCase(roomRepository, idGenerator)),
    new JoinRoomEndpoint(new JoinRoomUseCase(roomRepository, idGenerator)),
    new StartGameEndpoint(
      new StartDecisionPhaseUseCase(roomRepository, gameRepository, catalog, idGenerator),
    ),
  ];
  const http = createServer(
    createApp(endpoints, {
      authenticate: authentication(tokenVerifier),
      errorHandler: httpErrorHandler(errorCodeOf),
    }),
  );

  // Sockets
  const gameLock = new KeyedLock();
  const stateSender = new GameStateSender(
    new GetGameStateUseCase(roomRepository, gameRepository, catalog),
  );
  const roomSockets = new RoomSocketServer(
    [
      new ConnectHandler(
        new ConnectPlayerUseCase(roomRepository, gameRepository, notifier, idGenerator),
        tokenVerifier,
        notifier,
        gameLock,
        stateSender,
      ),
      new AnswerDilemmaHandler(
        new AnswerDilemmaUseCase(gameRepository, notifier),
        gameLock,
        stateSender,
      ),
    ],
    new DisconnectHandler(
      new DisconnectPlayerUseCase(roomRepository, gameRepository, notifier),
      notifier,
      gameLock,
    ),
    errorCodeOf,
    pingIntervalMs,
  );
  const sockets = roomSockets.attach(http);

  return { http, sockets };
}
