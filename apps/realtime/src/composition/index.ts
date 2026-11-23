import { createServer, type Server } from 'node:http';
import type { Logger } from '@thelever-app/db';
import {
  type DilemmaRepository,
  GetDilemmaPreviewUseCase,
  GetWorldResultUseCase,
  VoteAloneUseCase,
  type WorldResultRepository,
} from '@thelever-app/dilemmas';
import {
  AcceptDocumentUseCase,
  GetConsentUseCase,
  PUBLISHED_VERSIONS,
  type PublishedVersions,
} from '@thelever-app/consent';
import { DeclareAgeUseCase, GetFirstAccessUseCase, OpenAppUseCase } from '@thelever-app/identity';
import { FirstAccessSealProvider } from '@thelever-app/integrations/game';
import type { WebSocketServer } from 'ws';
import { createApp } from '../app.ts';
import type { CountryLookup } from '../first-access/country-lookup.ts';
import {
  AcceptDocumentEndpoint,
  DeclareAgeEndpoint,
  OpenAppEndpoint,
  requiringFirstAccess,
} from '../first-access/first-access.endpoints.ts';
import { FirstAccessGate } from '@thelever-app/integrations/first-access';
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
import { DilemmaPreviewEndpoint } from '../rooms/http/dilemma-preview.endpoint.ts';
import { VoteAloneEndpoint } from '../rooms/http/vote-alone.endpoint.ts';
import { WorldResultEndpoint } from '../rooms/http/world-result.endpoint.ts';
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
import { moderationUseCases, type ModerationUseCases } from './moderation.ts';
import { IllegalContentNoticeEndpoint } from '../moderation/http/illegal-content-notice.endpoint.ts';
import {
  ModerationNoticesEndpoint,
  SeeModerationNoticeEndpoint,
} from '../moderation/http/moderation-notices.endpoint.ts';
import { RoomCommandHandler } from '../rooms/sockets/room-command.handler.ts';
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
  /** The country of the address of a call, for the region the first access begins in. */
  readonly countryLookup: CountryLookup;
  /** The versions of the legal documents published; those of the code unless a test says otherwise. */
  readonly publishedVersions?: PublishedVersions;
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
  const catalog = dilemmaCatalog(repositories.dilemmaRepository, repositories.dilemmaQueries);
  const clock = new SystemClock();
  const firstAccess = firstAccessUseCases(
    repositories,
    configuration.publishedVersions ?? PUBLISHED_VERSIONS,
    clock,
  );

  // 2. The queries, and with them what sends each player the state of their room. One holder per
  // room at a time in this instance: its commands never interleave, and an event of the room
  // another instance published waits for the command in progress. Sending a game in its decision
  // phase sets the timer of its round in this instance.
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

  // 3. The commands, which notify the players of what changed, and what Moderation receives.
  const idGenerator = new RandomIdGenerator();
  const moderation = moderationUseCases({ ...repositories, idGenerator, clock, logger });
  const commands = gameCommands({
    ...repositories,
    moderation,
    catalog,
    notifier: notifierFor(socketNotifier),
    idGenerator,
    randomness,
    clock,
    sealProvider: firstAccess.sealProvider,
  });

  // 4. The HTTP routes and the room sockets on the same server.
  const http = createServer(
    createApp(
      [
        ...firstAccessEndpoints(firstAccess, configuration.countryLookup, runCommand),
        ...httpEndpoints(
          commands,
          queries,
          dilemmaEndpoints(
            repositories.dilemmaRepository,
            repositories.worldResults,
            firstAccess.gate,
          ),
          roomLock,
          runCommand,
          firstAccess.gate,
        ),
        ...moderationEndpoints(moderation, runCommand),
      ],
      {
        authenticate: authentication(
          configuration.tokenVerifier,
          configuration.appCheckVerifier,
          configuration.accessGate,
        ),
        errorHandler: httpErrorHandler(errorCodeOf),
        webOrigins: configuration.webOrigins,
      },
    ),
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

/** The use cases of the first access, from Identity and Consent, and what they give Game. */
interface FirstAccessUseCases {
  readonly openApp: OpenAppUseCase;
  readonly declareAge: DeclareAgeUseCase;
  readonly acceptDocument: AcceptDocumentUseCase;
  readonly getConsent: GetConsentUseCase;
  /** What stops who has not finished the first access. */
  readonly gate: FirstAccessGate;
  readonly sealProvider: FirstAccessSealProvider;
}

function firstAccessUseCases(
  {
    firstAccesses,
    acceptances,
  }: Pick<Awaited<ReturnType<typeof adaptersFor>>, 'firstAccesses' | 'acceptances'>,
  published: PublishedVersions,
  clock: SystemClock,
): FirstAccessUseCases {
  const getFirstAccess = new GetFirstAccessUseCase(firstAccesses, clock);
  const getConsent = new GetConsentUseCase(acceptances, published);
  return {
    openApp: new OpenAppUseCase(firstAccesses, clock),
    declareAge: new DeclareAgeUseCase(firstAccesses, clock),
    acceptDocument: new AcceptDocumentUseCase(acceptances, published, clock),
    getConsent,
    gate: new FirstAccessGate(getFirstAccess, getConsent),
    sealProvider: new FirstAccessSealProvider(getFirstAccess, getConsent),
  };
}

/** The routes of the first access: opening the app, the age and the legal documents. */
function firstAccessEndpoints(
  { openApp, declareAge, acceptDocument, getConsent, gate }: FirstAccessUseCases,
  countries: CountryLookup,
  runCommand: RunCommand,
): HttpEndpoint[] {
  return [
    new OpenAppEndpoint(openApp, getConsent, countries, runCommand),
    new DeclareAgeEndpoint(declareAge, gate, runCommand),
    new AcceptDocumentEndpoint(acceptDocument, gate, runCommand),
  ];
}

function httpEndpoints(
  commands: GameCommands,
  queries: GameQueries,
  dilemmas: readonly HttpEndpoint[],
  roomLock: KeyedLock,
  runCommand: RunCommand,
  gate: FirstAccessGate,
): HttpEndpoint[] {
  return [
    new HealthEndpoint(),
    // Only who finished the first access creates a room or joins one.
    requiringFirstAccess(new CreateRoomEndpoint(commands.createRoom, runCommand), gate),
    new RoomPreviewEndpoint(queries.getRoomPreview),
    requiringFirstAccess(new JoinRoomEndpoint(commands.joinRoom, roomLock, runCommand), gate),
    new SearchDilemmasEndpoint(queries.searchDilemmas),
    ...dilemmas,
  ];
}

/**
 * The routes of Dilemmas a link of the public web leads to: the preview of a dilemma, to play it
 * with the group or vote it alone, the vote and its world result.
 */
function dilemmaEndpoints(
  dilemmaRepository: DilemmaRepository,
  worldResults: WorldResultRepository,
  gate: FirstAccessGate,
): HttpEndpoint[] {
  return [
    new DilemmaPreviewEndpoint(new GetDilemmaPreviewUseCase(dilemmaRepository)),
    // Voting alone needs the game consent too: the vote counts for the world result.
    requiringFirstAccess(
      new VoteAloneEndpoint(new VoteAloneUseCase(dilemmaRepository, worldResults)),
      gate,
    ),
    new WorldResultEndpoint(new GetWorldResultUseCase(dilemmaRepository, worldResults)),
  ];
}

/**
 * The routes of Moderation: the web form of notices, which anyone sends without the first access,
 * and the moderation notices of whoever calls.
 */
function moderationEndpoints(
  moderation: ModerationUseCases,
  runCommand: RunCommand,
): HttpEndpoint[] {
  return [
    new IllegalContentNoticeEndpoint(moderation.receiveIllegalContentNotice, runCommand),
    new ModerationNoticesEndpoint(moderation.getModerationNotices),
    new SeeModerationNoticeEndpoint(moderation.seeModerationNotice, runCommand),
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
      ({ dilemmaId, reason, comment, language }, { roomId, playerId }) =>
        commands.reportDilemma.execute({
          roomId,
          playerId,
          dilemmaId,
          reason,
          language,
          ...(comment !== undefined && { comment }),
        }),
      roomLock,
      stateSender,
      runCommand,
    ),
    // Nothing changes in the room: nobody else learns about it.
    new RoomCommandHandler(
      'report-nickname',
      ({ playerId: reportedPlayerId, reason, comment }, { roomId, playerId }) =>
        commands.reportNickname.execute({
          roomId,
          playerId,
          reportedPlayerId,
          reason,
          ...(comment !== undefined && { comment }),
        }),
      roomLock,
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
