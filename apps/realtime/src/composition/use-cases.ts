import {
  type DilemmaQueries,
  type DilemmaRepository,
  FindCandidatesUseCase,
  GetDilemmasUseCase,
  SearchDilemmasUseCase as SearchCatalogUseCase,
} from '@thelever-app/dilemmas';
import {
  AnswerDilemmaUseCase,
  ChangeAvatarUseCase,
  ChangeRoomSettingsUseCase,
  ChooseRoundDilemmaUseCase,
  ClearRoundDilemmaUseCase,
  ConnectPlayerUseCase,
  CreateRoomUseCase,
  type DilemmaCatalog,
  type DilemmaLikes,
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
  MoveOnUseCase,
  ReactUseCase,
  LikeDilemmaUseCase,
  StartRematchUseCase,
  RevealEarlyUseCase,
  RunOutRoundUseCase,
  SkipDilemmaUseCase,
  type Clock,
  type ExplorationSlots,
  type PlayerNotifier,
  type Randomness,
  type RoomRepository,
  SearchDilemmasUseCase,
  StartGameUseCase,
} from '@thelever-app/game';
import { CachedDilemmaCatalog } from '@thelever-app/game/cache';
import { InMemoryDilemmaReports, InMemorySealProvider } from '@thelever-app/game/in-memory';
import { PublishedDilemmasCatalog } from '@thelever-app/integrations/game';
import type { RoundUseCases } from '../rooms/sockets/round-commands.ts';
import type { LobbyUseCases } from '../rooms/sockets/lobby-commands.ts';

/** The dilemmas Game plays with, read through what Dilemmas publishes. */
export function dilemmaCatalog(
  dilemmaRepository: DilemmaRepository,
  dilemmaQueries: DilemmaQueries,
): DilemmaCatalog {
  // Every connect and every answer reads the dilemmas played: once per instance is enough.
  return new CachedDilemmaCatalog(
    new PublishedDilemmasCatalog(
      new GetDilemmasUseCase(dilemmaRepository),
      new SearchCatalogUseCase(dilemmaQueries),
      new FindCandidatesUseCase(dilemmaQueries),
    ),
  );
}

/** What the queries of Game read from. */
export interface GameQueriesDependencies {
  readonly roomRepository: RoomRepository;
  readonly gameRepository: GameRepository;
  readonly catalog: DilemmaCatalog;
  /** The likes, which the reveal tells each player of. */
  readonly likes: DilemmaLikes;
  /** The preview suggests an avatar at random. */
  readonly randomness: Randomness;
  /** The preview shows only an open room. */
  readonly clock: Clock;
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
  likes,
  randomness,
  clock,
}: GameQueriesDependencies): GameQueries {
  return {
    getRoomState: new GetRoomStateUseCase(roomRepository, catalog),
    getGameState: new GetGameStateUseCase(roomRepository, gameRepository, catalog, likes),
    getRoomPreview: new GetRoomPreviewUseCase(roomRepository, randomness, clock),
    searchDilemmas: new SearchDilemmasUseCase(roomRepository, catalog),
  };
}

/** What the commands of Game need, besides what the queries read from. */
export interface GameCommandsDependencies extends GameQueriesDependencies {
  readonly notifier: PlayerNotifier;
  readonly idGenerator: IdGenerator;
}

/**
 * How many dilemmas in exploration a game keeps room for: 2 slots from 6 random rounds and 3 from
 * 11. The thresholds of exploration and moderation set them; they change here, not in
 * the rules of the game.
 */
const EXPLORATION_SLOTS: ExplorationSlots = [
  { fromRandomRounds: 6, slots: 2 },
  { fromRandomRounds: 11, slots: 3 },
];

/**
 * How many candidates each round of a game draws its dilemma from, at most: enough to space them,
 * never the whole catalog. A setting, as the exploration slots are.
 */
const CANDIDATES_PER_ROUND = 3;

/** The commands of Game: each one changes a room or a game and notifies its players. */
export interface GameCommands extends LobbyUseCases, RoundUseCases {
  readonly createRoom: CreateRoomUseCase;
  readonly joinRoom: JoinRoomUseCase;
  readonly connectPlayer: ConnectPlayerUseCase;
  readonly disconnectPlayer: DisconnectPlayerUseCase;
  readonly disconnectConnections: DisconnectConnectionsUseCase;
  readonly answerDilemma: AnswerDilemmaUseCase;
  readonly runOutRound: RunOutRoundUseCase;
  readonly leaveRoom: LeaveRoomUseCase;
  readonly reportDilemma: ReportDilemmaUseCase;
  readonly skipDilemma: SkipDilemmaUseCase;
}

export function gameCommands({
  roomRepository,
  gameRepository,
  catalog,
  likes,
  notifier,
  idGenerator,
  randomness,
  clock,
}: GameCommandsDependencies): GameCommands {
  // Until the first access exists, every answer, reaction and like carries the seal of before it.
  const sealProvider = new InMemorySealProvider();
  return {
    createRoom: new CreateRoomUseCase(roomRepository, catalog, idGenerator, randomness, clock),
    joinRoom: new JoinRoomUseCase({
      roomRepository,
      gameRepository,
      notifier,
      idGenerator,
      randomness,
      clock,
    }),
    connectPlayer: new ConnectPlayerUseCase(
      roomRepository,
      gameRepository,
      notifier,
      idGenerator,
      clock,
    ),
    disconnectPlayer: new DisconnectPlayerUseCase(roomRepository, gameRepository, notifier, clock),
    disconnectConnections: new DisconnectConnectionsUseCase(roomRepository, notifier),
    changeAvatar: new ChangeAvatarUseCase(roomRepository, notifier),
    changeSettings: new ChangeRoomSettingsUseCase(roomRepository, catalog, notifier),
    chooseRoundDilemma: new ChooseRoundDilemmaUseCase(roomRepository, catalog, notifier),
    clearRoundDilemma: new ClearRoundDilemmaUseCase(roomRepository, notifier),
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
      CANDIDATES_PER_ROUND,
    ),
    answerDilemma: new AnswerDilemmaUseCase({
      roomRepository,
      gameRepository,
      notifier,
      sealProvider,
      clock,
    }),
    revealEarly: new RevealEarlyUseCase(roomRepository, gameRepository, notifier, clock),
    moveOn: new MoveOnUseCase(roomRepository, gameRepository, notifier, clock),
    react: new ReactUseCase({ roomRepository, gameRepository, sealProvider, notifier }),
    likeDilemma: new LikeDilemmaUseCase({
      roomRepository,
      gameRepository,
      likes,
      sealProvider,
      notifier,
      clock,
    }),
    startRematch: new StartRematchUseCase(roomRepository, gameRepository, notifier),
    runOutRound: new RunOutRoundUseCase(roomRepository, gameRepository, notifier, clock),
    leaveRoom: new LeaveRoomUseCase(roomRepository, gameRepository, notifier, clock),
    // Until Moderation keeps them, the reports stay in the memory of the instance that took them.
    skipDilemma: new SkipDilemmaUseCase({ roomRepository, gameRepository, notifier, clock }),
    reportDilemma: new ReportDilemmaUseCase({
      roomRepository,
      gameRepository,
      reports: new InMemoryDilemmaReports(),
      notifier,
      clock,
    }),
  };
}
