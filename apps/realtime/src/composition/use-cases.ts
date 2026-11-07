import {
  type DilemmaRepository,
  GetDilemmasUseCase,
  SearchDilemmasUseCase as SearchCatalogUseCase,
} from '@thelever-app/dilemmas';
import {
  AddDilemmaUseCase,
  AnswerDilemmaUseCase,
  ChangeAvatarUseCase,
  ChangeRoomSettingsUseCase,
  ConnectPlayerUseCase,
  CreateRoomUseCase,
  type DilemmaCatalog,
  DisconnectConnectionsUseCase,
  DisconnectPlayerUseCase,
  ExpelPlayerUseCase,
  type GameRepository,
  GetGameStateUseCase,
  GetRoomPreviewUseCase,
  GetRoomStateUseCase,
  type IdGenerator,
  JoinRoomUseCase,
  LeaveRoomUseCase,
  ReportDilemmaUseCase,
  RunOutTotalTimeUseCase,
  StartRevealUseCase,
  type Clock,
  type ExplorationSlots,
  PickDilemmasUseCase,
  type PlayerNotifier,
  type Randomness,
  RemoveAddedDilemmaUseCase,
  type RoomRepository,
  SearchDilemmasUseCase,
  StartGameUseCase,
} from '@thelever-app/game';
import { CachedDilemmaCatalog } from '@thelever-app/game/cache';
import { InMemoryDilemmaReports, InMemorySealProvider } from '@thelever-app/game/in-memory';
import { PublishedDilemmasCatalog } from '@thelever-app/integrations/game';
import type { DecisionPhaseUseCases } from '../rooms/sockets/decision-phase-commands.ts';
import type { LobbyUseCases } from '../rooms/sockets/lobby-commands.ts';

/** The dilemmas Game plays with, read through what Dilemmas publishes. */
export function dilemmaCatalog(dilemmaRepository: DilemmaRepository): DilemmaCatalog {
  // Every connect and every answer reads the dilemmas played: once per instance is enough.
  return new CachedDilemmaCatalog(
    new PublishedDilemmasCatalog(
      new GetDilemmasUseCase(dilemmaRepository),
      new SearchCatalogUseCase(dilemmaRepository),
    ),
  );
}

/** What the queries of Game read from. */
export interface GameQueriesDependencies {
  readonly roomRepository: RoomRepository;
  readonly gameRepository: GameRepository;
  readonly catalog: DilemmaCatalog;
}

/** The queries of Game: they change nothing, so they notify no one. */
export interface GameQueries {
  readonly getRoomState: GetRoomStateUseCase;
  readonly getGameState: GetGameStateUseCase;
  readonly getRoomPreview: GetRoomPreviewUseCase;
  readonly searchDilemmas: SearchDilemmasUseCase;
}

export function gameQueries({
  roomRepository,
  gameRepository,
  catalog,
}: GameQueriesDependencies): GameQueries {
  return {
    getRoomState: new GetRoomStateUseCase(roomRepository, catalog),
    getGameState: new GetGameStateUseCase(roomRepository, gameRepository, catalog),
    getRoomPreview: new GetRoomPreviewUseCase(roomRepository),
    searchDilemmas: new SearchDilemmasUseCase(roomRepository, catalog),
  };
}

/** What the commands of Game need, besides what the queries read from. */
export interface GameCommandsDependencies extends GameQueriesDependencies {
  readonly notifier: PlayerNotifier;
  readonly idGenerator: IdGenerator;
  readonly randomness: Randomness;
  readonly clock: Clock;
}

/**
 * How many dilemmas in exploration a game by categories keeps room for: 2 slots from 6 dilemmas and 3
 * from 11. The thresholds of exploration and moderation set them; they change here, not in
 * the rules of the game.
 */
const EXPLORATION_SLOTS: ExplorationSlots = [
  { fromDilemmaCount: 6, slots: 2 },
  { fromDilemmaCount: 11, slots: 3 },
];

/** The commands of Game: each one changes a room or a game and notifies its players. */
export interface GameCommands extends LobbyUseCases, DecisionPhaseUseCases {
  readonly createRoom: CreateRoomUseCase;
  readonly joinRoom: JoinRoomUseCase;
  readonly connectPlayer: ConnectPlayerUseCase;
  readonly disconnectPlayer: DisconnectPlayerUseCase;
  readonly disconnectConnections: DisconnectConnectionsUseCase;
  readonly answerDilemma: AnswerDilemmaUseCase;
  readonly runOutTotalTime: RunOutTotalTimeUseCase;
  readonly leaveRoom: LeaveRoomUseCase;
  readonly reportDilemma: ReportDilemmaUseCase;
}

export function gameCommands({
  roomRepository,
  gameRepository,
  catalog,
  notifier,
  idGenerator,
  randomness,
  clock,
}: GameCommandsDependencies): GameCommands {
  return {
    createRoom: new CreateRoomUseCase(roomRepository, idGenerator, randomness),
    joinRoom: new JoinRoomUseCase({
      roomRepository,
      gameRepository,
      notifier,
      idGenerator,
      randomness,
    }),
    connectPlayer: new ConnectPlayerUseCase(roomRepository, notifier, idGenerator),
    disconnectPlayer: new DisconnectPlayerUseCase(roomRepository, gameRepository, notifier),
    disconnectConnections: new DisconnectConnectionsUseCase(roomRepository, notifier),
    changeAvatar: new ChangeAvatarUseCase(roomRepository, notifier),
    changeSettings: new ChangeRoomSettingsUseCase(roomRepository, notifier),
    pickDilemmas: new PickDilemmasUseCase(roomRepository, catalog, notifier),
    addDilemma: new AddDilemmaUseCase(roomRepository, catalog, notifier),
    removeAddedDilemma: new RemoveAddedDilemmaUseCase(roomRepository, notifier),
    expelPlayer: new ExpelPlayerUseCase(roomRepository, notifier),
    startGame: new StartGameUseCase(
      {
        roomRepository,
        gameRepository,
        dilemmaCatalog: catalog,
        notifier,
        idGenerator,
        randomness,
        clock,
      },
      EXPLORATION_SLOTS,
    ),
    // Until the first access exists, every answer carries the seal of before it.
    answerDilemma: new AnswerDilemmaUseCase({
      roomRepository,
      gameRepository,
      notifier,
      sealProvider: new InMemorySealProvider(),
      clock,
    }),
    startReveal: new StartRevealUseCase(roomRepository, gameRepository, notifier),
    runOutTotalTime: new RunOutTotalTimeUseCase(roomRepository, gameRepository, notifier, clock),
    leaveRoom: new LeaveRoomUseCase(roomRepository, gameRepository, notifier),
    // Until Moderation keeps them, the reports stay in the memory of the instance that took them.
    reportDilemma: new ReportDilemmaUseCase({
      roomRepository,
      gameRepository,
      reports: new InMemoryDilemmaReports(),
      notifier,
      clock,
    }),
  };
}
