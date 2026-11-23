import {
  AnswerDilemmaUseCase,
  DistributionPredictionVO,
  type PredictedShare,
  ChangeAvatarUseCase,
  ChangeRoomSettingsUseCase,
  ChooseRoundDilemmaUseCase,
  ClearRoundDilemmaUseCase,
  ConnectionChangedEvent,
  ConnectPlayerUseCase,
  AMBIENCES,
  Room,
  type RoomSettingsChanges,
  CreateRoomUseCase,
  MinorInRoomError,
  DeleteClosedRoomsUseCase,
  DisconnectPlayerUseCase,
  ExpelPlayerUseCase,
  GAP_MARKER,
  LeaveRoomUseCase,
  ReportDilemmaUseCase,
  ReportNicknameUseCase,
  WithdrawNicknameUseCase,
  FindNicknameOfReferenceUseCase,
  MoveOnUseCase,
  GetReadyToMoveOnUseCase,
  ReactUseCase,
  LikeDilemmaUseCase,
  UnlikeDilemmaUseCase,
  StartRematchUseCase,
  RestartGameUseCase,
  RevealEarlyUseCase,
  RunOutRoundUseCase,
  SkipDilemmaUseCase,
  DecisionPhaseOverError,
  PersonInTheGapVotesError,
  DilemmaSkippedError,
  VoteMissingError,
  type Seal,
  type SealProvider,
  type VotePrediction,
  GetGameStateUseCase,
  type GetGameStateOutput,
  GetRoomPreviewUseCase,
  GetRoomStateUseCase,
  JoinRoomUseCase,
  LobbyChangedEvent,
  NicknameAndAvatarTakenError,
  GameInProgressError,
  NotEnoughPlayersError,
  NotHostError,
  PlayerExpelledError,
  ProgressUpdatedEvent,
  RoomCodeNotFoundError,
  RoomClosedError,
  RoomFullError,
  AdultsOnlyRoomError,
  SearchDilemmasUseCase,
  StartGameUseCase,
  AvatarVO,
  type GetRoomStateOutput,
  type LobbyRound,
  type RoundChange,
  DilemmaNotSuitableError,
  DuplicateDilemmaError,
  InvalidRoomSettingError,
  RoundNotForPlayersError,
  RoundTakenError,
} from '@thelever-app/game';
import {
  InMemoryDilemmaCatalog,
  InMemoryDilemmaLikes,
  InMemoryGameRepository,
  ManualClock,
  InMemoryPlayerNotifier,
  InMemoryRoomRepository,
  SequentialIdGenerator,
  SequentialRandomness,
  type InMemoryDilemma,
} from '@thelever-app/game/in-memory';
import {
  InMemoryIssueRepository,
  InMemoryModerationNoticeRepository,
  InMemoryOutbox,
} from '@thelever-app/moderation/in-memory';
import {
  moderationInMemory,
  ModerationOfTheTestCatalog,
  TEAM_REASONS,
} from './moderation-of-the-tests.ts';
import {
  Dilemma,
  FindCandidatesUseCase,
  DilemmaNotFoundError,
  GetDilemmaPreviewUseCase,
  type GetDilemmaPreviewOutput,
  GetDilemmasUseCase,
  GetPublicCatalogUseCase,
  GetWorldResultUseCase,
  type GetWorldResultOutput,
  ImportCatalogUseCase,
  PublishWorldResultsUseCase,
  SearchDilemmasUseCase as SearchCatalogUseCase,
  VoteAloneUseCase,
} from '@thelever-app/dilemmas';
import {
  AcceptDocumentUseCase,
  currentVersionOf,
  GetConsentUseCase,
  type LegalDocumentVersion,
  PUBLISHED_VERSIONS,
} from '@thelever-app/consent';
import { InMemoryAcceptanceRepository } from '@thelever-app/consent/in-memory';
import {
  DeclareAgeUseCase,
  GetFirstAccessUseCase,
  MonthOfBirthNeededError,
  OpenAppUseCase,
} from '@thelever-app/identity';
import { InMemoryFirstAccessRepository } from '@thelever-app/identity/in-memory';
import { FirstAccessGate, FirstAccessRequiredError } from '@thelever-app/integrations/first-access';
import {
  FirstAccessSealProvider,
  ModerationDilemmaReports,
  ModerationNicknameReports,
  PublishedDilemmasCatalog,
} from '@thelever-app/integrations/game';
import { RoomNicknamesForModeration } from '@thelever-app/integrations/moderation';
import {
  buildSite,
  type BuiltSite,
  dilemmaPath,
  InMemorySiteFiles,
  LANGUAGES as SITE_LANGUAGES,
  type Page,
  publishedSite,
  publishSite,
  readable,
  respond,
} from '@thelever-app/site';
import {
  InMemoryCuratedCatalog,
  InMemoryDilemmaRepository,
  InMemoryWorldResultRepository,
  LanguageTagTranslator,
  SequentialIdGenerator as SequentialDilemmaIds,
} from '@thelever-app/dilemmas/in-memory';
import { ClientMessageDto, type TitleDto } from '@thelever-app/protocol';
import type {
  AnswerStepsView,
  Ambience,
  AmbienceOption,
  AnswerPlan,
  CardView,
  CatalogEntry,
  MarkedDilemma,
  ContentChoices,
  OpenSettingsView,
  SwitchView,
  Declaration,
  DeviceOptions,
  CreditsView,
  DonationLinks,
  FundingView,
  FirstAccessScreen,
  GameDriver,
  GameSettingsView,
  InvitationMethod,
  JoinRefusal,
  LegalDocument,
  PlayerView,
  PublicPageView,
  ReactionsView,
  RecordedAnswer,
  RankedView,
  RecordedLike,
  RecordedReaction,
  ReportReason,
  ReportedDilemma,
  ModerationIssueView,
  IllegalContentNoticeForm,
  ModerationNoticeView,
  EmailView,
  ResultsScreenView,
  RevealView,
  RoomChoices,
  RoomPreview,
  RoundSetting,
  RoundView,
  SettingsView,
  SupportInvitationView,
  SupportLineView,
  TitleView,
  WorldResultView,
} from './driver.ts';
import {
  CANDIDATES_PER_ROUND,
  catalogEntryOf,
  EXPLORATION_SLOTS,
  explorationSlotsFor,
  roundsForAGameOf,
  SPANISH_OPTION_TEXTS,
  TEST_DILEMMAS,
} from './test-catalog.ts';

/** Each reason of the scenarios, as Game names it. */
const REPORT_REASONS = {
  offensive: 'offensive',
  confusing: 'confusing',
  'badly translated': 'mistranslated',
  other: 'other',
} as const satisfies Record<ReportReason, string>;

/** Test data: the vote the driver casts when a step does not say which one; the first option. */
const VOTE = 'option-1';

/** The names of the titles of the game, as the screens and the scenarios write them. */
const TITLE_NAMES: Readonly<Record<TitleDto, string>> = {
  'almas-gemelas': 'Almas gemelas',
  'verso-suelto': 'Verso suelto',
  'la-voz-del-grupo': 'La voz del grupo',
  'iman-de-reacciones': 'Imán de reacciones',
  enigma: 'Enigma',
  'libro-abierto': 'Libro abierto',
  'el-mentalista': 'El Mentalista',
};
/** Test data: the vote the driver changes to; the second option of every dilemma. */
const OTHER_VOTE = 'option-2';

/** Test data: what the creation screen gets when a step does not choose. */
const DEFAULT_CHOICES = {
  ambience: 'classic',
  place: 'together',
  deviceLanguage: 'es',
} as const;

/** Test data: where the public web is, for its canonical addresses and its sitemap. */
const SITE_ORIGIN = 'https://thelever.test';
/** Test data: the donation page the public web of the scenarios links to. */
const DONATION_URL = 'https://ko-fi.test/thelever';

/** What a visitor sees on a page of a dilemma, as the job generated it. */
function publicPageViewOf(page: Page): PublicPageView {
  const dilemma = page.dilemma!;
  const texts = SITE_LANGUAGES.get(page.language)!;
  const args = dilemma.arguments;
  return {
    language: page.language,
    text: readable(dilemma.text, texts),
    options: dilemma.options.map(({ text }) => readable(text, texts)),
    arguments: args
      ? dilemma.options.map(({ optionId }) => {
          const argued = args.options.find((option) => option.optionId === optionId)!;
          return { for: readable(argued.for, texts), against: readable(argued.against, texts) };
        })
      : [],
    otherLanguages: Object.keys(page.alternates).filter((language) => language !== page.language),
    indexable: page.indexable,
  };
}

/** The test data, as the catalog of Game keeps it: every dilemma with the same two options. */
const DILEMMAS: readonly InMemoryDilemma[] = TEST_DILEMMAS.map(
  ({
    dilemmaId,
    text,
    minimumAge,
    category,
    tags,
    status,
    options,
    language,
    translations,
    type,
    scale,
    fixedOrder,
    compromising,
  }) => ({
    dilemmaId,
    compromising,
    language,
    translations,
    text,
    options: options.map((option, index) => ({ optionId: `option-${index + 1}`, text: option })),
    minimumAge: minimumAge as 16 | 18,
    category,
    tags,
    status,
    type,
    scale,
    fixedOrder,
  }),
);

/** Test data: each player of a scenario uses the app with an identity of their own. */
function identityOf(player: string): string {
  return `identity-of-${player}`;
}

interface Avatar {
  readonly face: string;
  readonly color: string;
}

function avatarText({ face, color }: Avatar): string {
  return `${face}/${color}`;
}

function avatarFrom(text: string): Avatar {
  const [face, color] = text.split('/');
  if (!face || !color) throw new Error(`"${text}" is not an avatar`);
  return { face, color };
}

/** The option of the dilemma with that text, in any case. */
function optionIdOf(dilemmaId: string, text: string): string {
  const option = DILEMMAS.find((dilemma) => dilemma.dilemmaId === dilemmaId)?.options.find(
    (candidate) => candidate.text.toLowerCase() === text.toLowerCase(),
  );
  if (!option) throw new Error(`Dilemma ${dilemmaId} has no option "${text}"`);
  return option.optionId;
}

function optionTextOf(dilemmaId: string, optionId: string): string {
  const option = DILEMMAS.find((dilemma) => dilemma.dilemmaId === dilemmaId)?.options.find(
    (candidate) => candidate.optionId === optionId,
  );
  if (!option) throw new Error(`Dilemma ${dilemmaId} has no option ${optionId}`);
  return option.text;
}

function roundViewOf(round: LobbyRound): RoundView {
  switch (round.origin) {
    case 'random':
      return { origin: 'random', categories: round.categories, content: round.content };
    case 'specific':
      return { origin: 'specific', dilemmaId: round.dilemma.dilemmaId };
    case 'players':
      return { origin: 'players', dilemmaId: round.dilemma?.dilemmaId ?? null };
  }
}

/** A round of the room as the host would set it again, with its id so it stays the same round. */
function roundChangeOf(round: LobbyRound): RoundChange {
  switch (round.origin) {
    case 'random':
      return {
        id: round.roundId,
        origin: 'random',
        categories: round.categories,
        content: round.content,
      };
    case 'specific':
      return { id: round.roundId, origin: 'specific', dilemmaId: round.dilemma.dilemmaId };
    case 'players':
      return { id: round.roundId, origin: 'players' };
  }
}

/** One player of the scenario, as the driver knows them. */
/** A device a scenario of the first access brings in, and what its screen went through. */
interface AcceptanceDevice {
  readonly country: string;
  /** Whether the age screen asks for the month, for the year chosen or because the room server did. */
  monthAsked: boolean;
  /** Whether the cookie manager was answered. */
  cookiesAnswered: boolean;
  /** Whether the app was opened from the invitation link to a room. */
  fromInvitation: boolean;
}

/** The version of the game consent a player gives in the first access today. */
const GAME_CONSENT_VERSION = String(currentVersionOf('game-consent', PUBLISHED_VERSIONS));

/** The seal of an adult who finished the first access, which every player has unless the scenario says. */
const ADULT_SEAL: Seal = {
  gameConsentVersion: GAME_CONSENT_VERSION,
  researchConsentVersion: null,
  commercialLicenceConsentVersion: null,
  underEighteen: false,
};

interface AcceptancePlayer {
  readonly identity: string;
  playerId: string | undefined;
  /** The code typed on the join screen, before pressing the button to enter. */
  typedCode: string | undefined;
  /** The room this player opened and has not entered yet, or entered. */
  roomId: string | undefined;
  preview: RoomPreview | undefined;
  /** Who is inside the room this player opened, as the screen to join knows them. */
  previewPlayers: readonly { readonly nickname: string; readonly avatar: Avatar }[];
  /** The avatar the screen to create or join a room shows as theirs, before they enter. */
  avatar: Avatar | undefined;
  /** Whether they were asked to choose another avatar, since someone with their nickname has it. */
  askedForAnotherAvatar: boolean;
  refusal: JoinRefusal | undefined;
  /** The open connection of the player, as a socket of the room server would hold it. */
  connectionId: string | undefined;
  /** The state of the room on the device, and how many changes of the lobby it had been told of. */
  screen: { readonly state: GetRoomStateOutput; readonly notices: number } | undefined;
  /** The dilemmas the device keeps as played, which it sends on entering a room. */
  played: readonly string[];
}

/**
 * Drives the application layer of the Game context with in-memory adapters.
 * No browser, no network, no database.
 *
 * It is the composition root of the scenario: it decides which adapter sits behind each port.
 * Cucumber builds a new World, and so a new driver, for every scenario, so nothing leaks between them.
 *
 * What a player sees on screen comes from what the application gives them: the code of the room
 * stands for the link and the QR built from it, and the state of the room for the lobby.
 */
/** The visitor of the public web, and who they are when they vote alone or create a room. */
const VISITOR = 'Visitor';
const VISITOR_IDENTITY = identityOf(VISITOR);

export class AcceptanceDriver implements GameDriver {
  readonly #catalog = new InMemoryDilemmaCatalog(DILEMMAS);
  readonly #roomRepository = new InMemoryRoomRepository();
  readonly #gameRepository = new InMemoryGameRepository();
  /** Kept with its concrete type to read what each player received. */
  readonly #notifier = new InMemoryPlayerNotifier();
  readonly #clock = new ManualClock();
  /** Moderation in memory, on the catalog of the tests, which Game plays from here. */
  readonly #moderationCatalog = new ModerationOfTheTestCatalog(this.#catalog, DILEMMAS);
  /** Kept with its concrete type to read the comments Moderation keeps. */
  readonly #moderationIssues = new InMemoryIssueRepository();
  readonly #moderation = moderationInMemory({
    storage: {
      issues: this.#moderationIssues,
      outbox: new InMemoryOutbox(),
      notices: new InMemoryModerationNoticeRepository(),
    },
    dilemmas: this.#moderationCatalog,
    nicknames: new RoomNicknamesForModeration({
      findNicknameOfReference: new FindNicknameOfReferenceUseCase(this.#roomRepository),
      withdrawNickname: new WithdrawNicknameUseCase(this.#roomRepository, this.#notifier),
    }),
    clock: this.#clock,
  });
  /** Who was told the team will review what they reported. */
  readonly #toldOfReview = new Set<string>();
  #noticeAcknowledged = false;
  /** The first access of each identity and the documents it accepted, in Identity and Consent. */
  readonly #firstAccesses = new InMemoryFirstAccessRepository();
  readonly #acceptances = new InMemoryAcceptanceRepository();
  /** What has been published of the legal documents: a scenario may publish a new version. */
  readonly #published: LegalDocumentVersion[] = [...PUBLISHED_VERSIONS];
  readonly #getFirstAccess = new GetFirstAccessUseCase(this.#firstAccesses, this.#clock);
  readonly #getConsent = new GetConsentUseCase(this.#acceptances, this.#published);
  readonly #firstAccessGate = new FirstAccessGate(this.#getFirstAccess, this.#getConsent);
  readonly #firstAccessSeals = new FirstAccessSealProvider(this.#getFirstAccess, this.#getConsent);
  /** The devices a scenario of the first access brings in, by identity: the others finished it. */
  readonly #devices = new Map<string, AcceptanceDevice>();
  /**
   * The seal of each player: what a scenario declared for them; through their first access, for a
   * device the scenario brought in; and for everyone else, the one of an adult who finished it.
   */
  readonly #sealProvider: SealProvider = {
    sealFor: async (identity) =>
      this.#seals.get(identity) ??
      (this.#devices.has(identity) ? this.#firstAccessSeals.sealFor(identity) : ADULT_SEAL),
  };
  /** What each identity declared and consented to, which the seal provider hands out. */
  readonly #seals = new Map<string, Seal>();
  /** The player of the visitor in the room they created from a public page. */
  #visitorHostId: string | undefined;
  readonly #likes = new InMemoryDilemmaLikes();
  /** Whether each player turned on the nicknames of the others on the card they have open. */
  readonly #namesOnTheCard = new Set<string>();
  /** The Dilemmas context, for what the curation team does: Game reads its own test catalog. */
  readonly #curatedCatalog = new InMemoryCuratedCatalog();
  readonly #dilemmaRepository = new InMemoryDilemmaRepository();
  /** The languages of the app, which the catalog is translated into. */
  readonly #importCatalog = new ImportCatalogUseCase(
    this.#curatedCatalog,
    new LanguageTagTranslator(),
    this.#dilemmaRepository,
    new SequentialDilemmaIds('public'),
    ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca'],
  );
  /** The language of the device of each player who does not use the app in Spanish. */
  readonly #languages = new Map<string, string>();
  /** The public web: the number of the catalog of each dilemma by its name, and what was generated. */
  readonly #publicNumbers = new Map<string, number>();
  readonly #siteFiles = new InMemorySiteFiles();
  #site: BuiltSite | undefined;
  /** What the screen to play a dilemma with the group shows of the one the visitor chose. */
  #dilemmaToPlay: GetDilemmaPreviewOutput | undefined;
  /** The language the link from the public web opens the app in. */
  #appLanguage: string | undefined;
  /** The world results, and what the visitor chose to vote alone, voted and saw of it. */
  readonly #worldResults = new InMemoryWorldResultRepository(
    async (id) => (await this.#dilemmaRepository.findById(id))?.version,
  );
  #dilemmaToVote: GetDilemmaPreviewOutput | undefined;
  /** Whether the app the visitor opened by a link said the dilemma to vote is not available. */
  #dilemmaToVoteUnavailable = false;
  #visitorVote: string | undefined;
  #worldResultSeen: GetWorldResultOutput | undefined;
  #visitorRoomId: string | undefined;

  readonly #createRoom: CreateRoomUseCase;
  readonly #getRoomPreview: GetRoomPreviewUseCase;
  readonly #joinRoom: JoinRoomUseCase;
  readonly #getRoomState: GetRoomStateUseCase;
  readonly #changeAvatar: ChangeAvatarUseCase;
  readonly #changeRoomSettings: ChangeRoomSettingsUseCase;
  readonly #chooseRoundDilemma: ChooseRoundDilemmaUseCase;
  readonly #clearRoundDilemma: ClearRoundDilemmaUseCase;
  readonly #searchDilemmas: SearchDilemmasUseCase;
  readonly #expelPlayer: ExpelPlayerUseCase;
  readonly #startGame: StartGameUseCase;
  readonly #answerDilemma: AnswerDilemmaUseCase;
  readonly #getGameState: GetGameStateUseCase;
  readonly #connectPlayer: ConnectPlayerUseCase;
  readonly #disconnectPlayer: DisconnectPlayerUseCase;
  readonly #revealEarly: RevealEarlyUseCase;
  readonly #runOutRound: RunOutRoundUseCase;
  readonly #moveOn: MoveOnUseCase;
  readonly #getReadyToMoveOn: GetReadyToMoveOnUseCase;
  readonly #react: ReactUseCase;
  readonly #likeDilemma: LikeDilemmaUseCase;
  readonly #unlikeDilemma: UnlikeDilemmaUseCase;
  readonly #startRematch: StartRematchUseCase;
  readonly #restartGame: RestartGameUseCase;
  readonly #leaveRoom: LeaveRoomUseCase;
  readonly #reportDilemma: ReportDilemmaUseCase;
  readonly #reportNickname: ReportNicknameUseCase;
  readonly #skipDilemma: SkipDilemmaUseCase;
  readonly #deleteClosedRooms: DeleteClosedRoomsUseCase;
  /** What each player is answering of the dilemma they are on, as the screen holds it. */
  readonly #drafts = new Map<
    string,
    {
      readonly dilemmaId: string;
      vote: string | null;
      votePredictions: VotePrediction[];
      distributionPrediction?: PredictedShare[];
      ready?: boolean;
    }
  >();

  /** In the order the scenario introduced them. */
  readonly #players = new Map<string, AcceptancePlayer>();
  /** The votes each player cast, in order, to look for them where they must not be. */
  readonly #votes = new Map<string, { readonly dilemmaId: string; readonly vote: string }[]>();
  #roomId: string | undefined;
  #gameId: string | undefined;
  #host: string | undefined;
  /** The players the driver brought in to have enough to start. */
  #fillers = 0;

  constructor() {
    const idGenerator = new SequentialIdGenerator();
    const randomness = new SequentialRandomness();
    const rooms = this.#roomRepository;
    const notifier = this.#notifier;
    const catalog = this.#catalog;
    const games = this.#gameRepository;
    const clock = this.#clock;

    this.#createRoom = new CreateRoomUseCase(
      rooms,
      catalog,
      idGenerator,
      randomness,
      clock,
      this.#sealProvider,
    );
    this.#getRoomPreview = new GetRoomPreviewUseCase(rooms, randomness, clock);
    this.#joinRoom = new JoinRoomUseCase({
      sealProvider: this.#sealProvider,
      roomRepository: rooms,
      gameRepository: games,
      notifier,
      idGenerator,
      randomness,
      clock,
    });
    this.#getRoomState = new GetRoomStateUseCase(rooms, catalog);
    this.#changeAvatar = new ChangeAvatarUseCase(rooms, notifier);
    this.#changeRoomSettings = new ChangeRoomSettingsUseCase(rooms, catalog, notifier);
    this.#chooseRoundDilemma = new ChooseRoundDilemmaUseCase(rooms, catalog, notifier);
    this.#clearRoundDilemma = new ClearRoundDilemmaUseCase(rooms, notifier);
    this.#searchDilemmas = new SearchDilemmasUseCase(rooms, catalog);
    this.#expelPlayer = new ExpelPlayerUseCase(rooms, notifier);
    this.#startGame = new StartGameUseCase(
      {
        roomRepository: rooms,
        gameRepository: this.#gameRepository,
        dilemmaCatalog: catalog,
        notifier,
        idGenerator,
        randomness,
        clock,
      },
      EXPLORATION_SLOTS,
      CANDIDATES_PER_ROUND,
    );
    this.#answerDilemma = new AnswerDilemmaUseCase({
      roomRepository: rooms,
      gameRepository: games,
      notifier,
      sealProvider: this.#sealProvider,
      dilemmaCatalog: this.#catalog,
      clock,
    });
    this.#getGameState = new GetGameStateUseCase(rooms, this.#gameRepository, catalog, this.#likes);
    this.#react = new ReactUseCase({
      roomRepository: rooms,
      gameRepository: games,
      sealProvider: this.#sealProvider,
      notifier,
    });
    this.#likeDilemma = new LikeDilemmaUseCase({
      roomRepository: rooms,
      gameRepository: games,
      likes: this.#likes,
      sealProvider: this.#sealProvider,
      notifier,
      clock,
    });
    this.#unlikeDilemma = new UnlikeDilemmaUseCase({
      roomRepository: rooms,
      gameRepository: games,
      likes: this.#likes,
      notifier,
    });
    this.#startRematch = new StartRematchUseCase(rooms, games, notifier);
    this.#restartGame = new RestartGameUseCase(rooms, games, notifier);
    this.#connectPlayer = new ConnectPlayerUseCase(rooms, games, notifier, idGenerator, clock);
    this.#disconnectPlayer = new DisconnectPlayerUseCase(rooms, games, notifier, clock);
    this.#revealEarly = new RevealEarlyUseCase(rooms, games, notifier, clock);
    this.#runOutRound = new RunOutRoundUseCase(rooms, games, notifier, clock);
    this.#moveOn = new MoveOnUseCase(rooms, games, notifier, clock);
    this.#getReadyToMoveOn = new GetReadyToMoveOnUseCase(rooms, games, notifier, clock);
    this.#leaveRoom = new LeaveRoomUseCase(rooms, games, notifier, clock);
    this.#skipDilemma = new SkipDilemmaUseCase({
      roomRepository: rooms,
      gameRepository: games,
      notifier,
      clock,
    });
    this.#deleteClosedRooms = new DeleteClosedRoomsUseCase(rooms, games, clock);
    this.#reportDilemma = new ReportDilemmaUseCase({
      roomRepository: rooms,
      gameRepository: games,
      reports: new ModerationDilemmaReports(this.#moderation.receiveDilemmaReport),
      notifier,
      clock,
    });
    this.#reportNickname = new ReportNicknameUseCase({
      roomRepository: rooms,
      reports: new ModerationNicknameReports(this.#moderation.receiveNicknameReport),
      clock,
    });
  }

  async start(): Promise<void> {
    // Nothing to prepare: the constructor already built a fresh set of adapters for this scenario.
  }

  async stop(): Promise<void> {
    // Nothing to release: everything lives in memory.
  }

  // Lobby

  /** The screen shows any avatar: nobody is in a room that does not exist yet. */
  async openRoomCreation(host: string): Promise<void> {
    const player = this.#introduce(host);
    player.avatar ??= AvatarVO.all()[0];
  }

  // The first access

  async newDevice(user: string, { country }: DeviceOptions): Promise<void> {
    const { identity } = this.#introduce(user);
    this.#devices.set(identity, {
      country,
      monthAsked: false,
      cookiesAnswered: false,
      fromInvitation: false,
    });
  }

  async openApp(user: string, from?: 'invitation'): Promise<void> {
    const { identity } = this.#playerCalled(user);
    const device = this.#deviceOf(identity);
    device.fromInvitation ||= from === 'invitation';
    await new OpenAppUseCase(this.#firstAccesses, this.#clock).execute({
      identity,
      country: device.country,
    });
  }

  async declareAge(user: string, age: number): Promise<void> {
    // Born in December of the year before they turned it, so they are that age whatever the day.
    const year = this.#clock.now().getUTCFullYear() - age - 1;
    if (!(await this.#declareBirth(user, year))) await this.#declareBirth(user, year, 12);
  }

  async chooseBirthYear(user: string, year: number): Promise<void> {
    const { identity } = this.#playerCalled(user);
    const status = await this.#firstAccessGate.statusOf(identity);
    // The screen asks for the month as soon as the year is one the room server asks it for.
    this.#deviceOf(identity).monthAsked =
      status !== undefined && year >= status.monthOfBirthAskedFrom;
  }

  async acceptTerms(user: string): Promise<void> {
    await this.#accept(user, 'terms-of-use');
  }

  async declineTerms(): Promise<void> {
    // Not accepting is leaving them as they are: the room server keeps nothing.
  }

  async giveGameConsent(user: string): Promise<void> {
    await this.#accept(user, 'game-consent');
  }

  async answerCookieConsent(user: string): Promise<void> {
    this.#deviceOf(this.#playerCalled(user).identity).cookiesAnswered = true;
  }

  async firstAccessScreenOf(user: string): Promise<FirstAccessScreen> {
    const { identity } = this.#playerCalled(user);
    const device = this.#deviceOf(identity);
    const status = await this.#firstAccessGate.statusOf(identity);
    switch (status?.step ?? 'age') {
      case 'blocked-country':
      case 'under-minimum-age':
        return status!.step as FirstAccessScreen;
      case 'age':
        return device.monthAsked ? 'month' : 'age';
      case 'documents':
        if (status!.pending[0] === 'game-consent') return 'game-consent';
        return status!.changed.includes('terms-of-use') ? 'new-terms' : 'terms';
      case 'done':
        if (!device.cookiesAnswered) return 'cookies';
        return device.fromInvitation ? 'join' : 'home';
    }
  }

  async preselected(user: string, choice: 'year' | 'month' | 'game-consent'): Promise<boolean> {
    // The year and the month are what the person declares: nothing is chosen for them before.
    if (choice !== 'game-consent') return false;
    const status = await this.#firstAccessGate.statusOf(this.#playerCalled(user).identity);
    return status !== undefined && !status.pending.includes('game-consent');
  }

  async mentionsMinimumAge(user: string): Promise<boolean> {
    // What the screen of the age shows comes from where the first access is, which says no age.
    const status = await this.#firstAccessGate.statusOf(this.#playerCalled(user).identity);
    return status !== undefined && JSON.stringify(status).match(/\b1[68]\b|minimum/i) !== null;
  }

  async legalTextsOfferedTo(user: string): Promise<readonly ('terms' | 'privacy')[]> {
    // The full texts are pages of the public web: the terms while they are to accept, and the
    // privacy policy beside the game consent.
    const status = await this.#firstAccessGate.statusOf(this.#playerCalled(user).identity);
    return status?.pending.includes('terms-of-use') ? ['terms', 'privacy'] : ['privacy'];
  }

  async toldTheGameConsentChanged(user: string): Promise<boolean> {
    const status = await this.#firstAccessGate.statusOf(this.#playerCalled(user).identity);
    return status?.changed.includes('game-consent') === true;
  }

  async canUseTheApp(user: string): Promise<boolean> {
    try {
      await this.#firstAccessGate.ensureDone(this.#playerCalled(user).identity);
      return true;
    } catch (error) {
      if (error instanceof FirstAccessRequiredError) return false;
      throw error;
    }
  }

  async acceptedVersionOf(user: string, document: LegalDocument): Promise<number | undefined> {
    const accepted = await this.#acceptances.findByIdentity(this.#playerCalled(user).identity);
    return accepted.versionOf(document);
  }

  async currentVersionOf(document: LegalDocument): Promise<number> {
    return currentVersionOf(document, this.#published);
  }

  async finishFirstAccess(user: string): Promise<void> {
    await this.newDevice(user, { country: 'ES' });
    await this.openApp(user);
    await this.declareAge(user, 30);
    await this.acceptTerms(user);
    await this.giveGameConsent(user);
    await this.answerCookieConsent(user);
  }

  async acceptedAnEarlierVersion(): Promise<void> {
    // What the player accepted is the version of then: the next one makes it an earlier one.
  }

  async publishVersionThatAsksAgain(document: LegalDocument): Promise<void> {
    const version = currentVersionOf(document, this.#published) + 1;
    this.#published.push({ document, version, asksAgain: true });
  }

  async keptFirstAccessOf(user: string): Promise<Readonly<Record<string, unknown>>> {
    const kept = await this.#firstAccesses.findByIdentity(this.#playerCalled(user).identity);
    if (!kept) throw new Error(`${user} never opened the app`);
    return { ...kept.toSnapshot() };
  }

  async consentPointsShownTo(): Promise<readonly string[]> {
    throw new Error(
      'Only the device tells the points of the game consent: the scenario must be @screen',
    );
  }

  async toldWhyTheConsentIsApart(): Promise<boolean> {
    throw new Error('Only the device says why the consent is apart: the scenario must be @screen');
  }

  async openHowTheLeverIsFunded(): Promise<boolean> {
    throw new Error('Only the device shows how TheLever is funded: the scenario must be @screen');
  }

  async personalisedAdsAllowedFor(): Promise<boolean> {
    throw new Error('Only the device decides on personalised ads: the scenario must be @screen');
  }

  async toldAboutGlobalPrivacyControl(): Promise<boolean> {
    throw new Error('Only the device reads Global Privacy Control: the scenario must be @screen');
  }

  async browserOffersToInstall(): Promise<void> {
    throw new Error('Only the browser offers to install the app: the scenario must be @screen');
  }

  async reachHome(): Promise<void> {
    throw new Error('Only the device has a start: the scenario must be @screen');
  }

  async offeredToInstall(): Promise<boolean> {
    throw new Error('Only the device offers to install the app: the scenario must be @screen');
  }

  async closeInstallOffer(): Promise<void> {
    throw new Error('Only the device offers to install the app: the scenario must be @screen');
  }

  async letDaysPassOnTheDevice(): Promise<void> {
    throw new Error('Only the device keeps when it closed the offer: the scenario must be @screen');
  }

  async finishAGame(): Promise<void> {
    throw new Error('Only the device remembers a finished game: the scenario must be @screen');
  }

  async anonymousNoticeShownTo(): Promise<readonly string[]> {
    throw new Error('Only the device tells what anonymous means: the scenario must be @screen');
  }

  async declaredAgeOnTheDevice(): Promise<void> {
    throw new Error('Only the device invites to donate: the scenario must be @screen');
  }

  async chanceInvitesToDonate(): Promise<void> {
    throw new Error('Only the device draws the invitation to donate: the scenario must be @screen');
  }

  async supportLineSeenBy(): Promise<SupportLineView | undefined> {
    throw new Error('Only the device invites to donate: the scenario must be @screen');
  }

  async supportCardSeenBy(): Promise<SupportInvitationView | undefined> {
    throw new Error('Only the device invites to donate: the scenario must be @screen');
  }

  async closeSupportCard(): Promise<void> {
    throw new Error('Only the device invites to donate: the scenario must be @screen');
  }

  #deviceOf(identity: string): AcceptanceDevice {
    const device = this.#devices.get(identity);
    if (!device) throw new Error(`The scenario brings in no device for ${identity}`);
    return device;
  }

  /** Whether the age was taken: without the month of who may be under 18, the screen asks for it. */
  async #declareBirth(user: string, birthYear: number, birthMonth?: number): Promise<boolean> {
    const { identity } = this.#playerCalled(user);
    try {
      await new DeclareAgeUseCase(this.#firstAccesses, this.#clock).execute({
        identity,
        birthYear,
        ...(birthMonth !== undefined && { birthMonth }),
      });
      this.#deviceOf(identity).monthAsked = false;
      return true;
    } catch (error) {
      if (!(error instanceof MonthOfBirthNeededError)) throw error;
      this.#deviceOf(identity).monthAsked = true;
      return false;
    }
  }

  async #accept(user: string, document: LegalDocument): Promise<void> {
    await new AcceptDocumentUseCase(this.#acceptances, this.#published, this.#clock).execute({
      identity: this.#playerCalled(user).identity,
      document,
      version: currentVersionOf(document, this.#published),
    });
  }

  async createRoom(host: string, choices: RoomChoices = {}): Promise<void> {
    const { ambience, place, deviceLanguage } = { ...DEFAULT_CHOICES, ...choices };
    await this.openRoomCreation(host);
    const player = this.#playerCalled(host);
    const { roomId, hostId } = await this.#createRoom.execute({
      ambience,
      hostNickname: host,
      hostIdentity: player.identity,
      hostAvatar: this.#avatarOnScreen(host),
      place,
      dilemmaLanguage: deviceLanguage,
      hostPlayedDilemmaIds: player.played,
    });
    this.#roomId = roomId;
    this.#host = host;
    player.playerId = hostId;
    player.roomId = roomId;
    await this.#screenOf(host);
  }

  /** What the single command that creates the room took, as the room keeps it. */
  async askedOnCreation(host: string): Promise<readonly ('nickname' | 'place' | 'nature')[]> {
    const state = await this.#roomStateOf(host);
    const nickname = state.players.find(({ playerId }) => playerId === state.playerId)?.nickname;
    return [
      ...(nickname === host ? (['nickname'] as const) : []),
      ...(state.place ? (['place'] as const) : []),
    ];
  }

  async isHost(player: string): Promise<boolean> {
    const state = await this.#roomStateOf(player);
    return state.hostId === state.playerId;
  }

  async roomCodeSeenBy(player: string): Promise<string> {
    return this.#codeSeenBy(player);
  }

  /** The link carries the code of the room, so it works if the code leads to the room. */
  async canShareInvitationLink(player: string): Promise<boolean> {
    return this.#codeLeadsToTheRoom(player);
  }

  /** The QR carries the invitation link, so it works if the code leads to the room. */
  async canShowQrFullScreen(player: string): Promise<boolean> {
    return this.#codeLeadsToTheRoom(player);
  }

  /** The lobby advises the video call to a group that plays remotely. */
  async videoCallAdviceSeenBy(player: string): Promise<boolean> {
    return (await this.#roomStateOf(player)).place === 'remote';
  }

  /** The room keeps it and every game of the room copies it when it starts. */
  async placeRecorded(): Promise<string> {
    return (await this.#roomStateOf(this.#hostName())).place;
  }

  /** The application never knows what a device remembers: the scenarios tagged @screen. */
  async lastPlayedAs(): Promise<void> {
    throw new Error('Only the device remembers the last nickname: the scenario must be @screen');
  }

  async nicknameFieldSeenBy(): Promise<string> {
    throw new Error('Only the device shows the nickname field: the scenario must be @screen');
  }

  async openInvitation(player: string, method: InvitationMethod): Promise<void> {
    // The link and the QR carry the code of the room: every method ends up opening it by its code.
    void method;
    await this.typeRoomCode(player, await this.roomCodeSeenBy(this.#hostName()));
    await this.enterTypedCode(player);
  }

  /** The screen only holds the code: nothing asks the room server for it yet. */
  async typeRoomCode(player: string, code: string): Promise<void> {
    const typer = this.#introduce(player);
    typer.typedCode = code;
    typer.preview = undefined;
    typer.refusal = undefined;
  }

  async isOnJoinCodeScreen(player: string): Promise<boolean> {
    const { typedCode, preview, refusal } = this.#playerCalled(player);
    return typedCode !== undefined && preview === undefined && refusal === undefined;
  }

  async enterTypedCode(player: string): Promise<void> {
    const opener = this.#playerCalled(player);
    const code = opener.typedCode;
    if (code === undefined) throw new Error(`${player} presses to enter without typing a code`);
    try {
      const preview = await this.#getRoomPreview.execute({ code, identity: opener.identity });
      opener.roomId = preview.roomId;
      opener.preview = {
        host: preview.hostNickname,
        ambience: preview.ambience,
        variant: preview.variant,
        adultsOnly: preview.adultsOnly,
        compromisingDilemmas: preview.compromisingDilemmas,
        playerCount: preview.players.length,
        avatars: preview.players.map(({ avatar }) => avatarText(avatar)),
      };
      opener.previewPlayers = preview.players;
      opener.avatar = preview.suggestedAvatar;
      opener.refusal = undefined;
    } catch (error) {
      if (!(error instanceof RoomCodeNotFoundError)) throw error;
      opener.preview = undefined;
      opener.refusal = 'room-does-not-exist';
    }
  }

  async roomPreviewSeenBy(player: string): Promise<RoomPreview | undefined> {
    return this.#playerCalled(player).preview;
  }

  async typeNickname(): Promise<void> {
    throw new Error('Only the device has a nickname field: the scenario must be @screen');
  }

  async namesakeWarningSeenBy(): Promise<string | undefined> {
    throw new Error('Only the device warns about a namesake: the scenario must be @screen');
  }

  async confirmNickname(player: string, nickname: string): Promise<void> {
    const joiner = this.#playerCalled(player);
    if (!joiner.roomId) throw new Error(`The scenario has ${player} enter without opening a room`);
    try {
      const { playerId, joinedLate } = await this.#joinRoom.execute({
        roomId: joiner.roomId,
        nickname,
        identity: joiner.identity,
        avatar: this.#avatarOnScreen(player),
        playedDilemmaIds: joiner.played,
      });
      joiner.playerId = playerId;
      joiner.refusal = undefined;
      joiner.askedForAnotherAvatar = false;
      await this.#screenOf(player);
      // Who joins a game in progress has it open at once, as their device would.
      if (joinedLate) await this.reconnect(player);
    } catch (error) {
      if (error instanceof RoomFullError) joiner.refusal = 'room-full';
      else if (error instanceof AdultsOnlyRoomError) joiner.refusal = 'adults-only';
      else if (error instanceof PlayerExpelledError) joiner.refusal = 'expelled';
      else if (error instanceof NicknameAndAvatarTakenError) joiner.askedForAnotherAvatar = true;
      else throw error;
    }
  }

  async joinRoom(player: string, nickname = player): Promise<void> {
    await this.tryToJoinRoom(player, nickname);
    const { refusal } = this.#playerCalled(player);
    if (refusal) throw new Error(`The scenario has ${player} join, but the room says ${refusal}`);
  }

  async tryToJoinRoom(player: string, nickname = player): Promise<void> {
    await this.openInvitation(player, 'code');
    await this.confirmNickname(player, nickname);
  }

  async joinRefusalSeenBy(player: string): Promise<JoinRefusal | undefined> {
    return this.#playerCalled(player).refusal;
  }

  async isInTheRoom(player: string): Promise<boolean> {
    const { playerId } = this.#playerCalled(player);
    if (!playerId) return false;
    const { players } = await this.#roomStateOf(this.#hostName());
    return players.some((seen) => seen.playerId === playerId);
  }

  async isInTheLobby(player: string): Promise<boolean> {
    if (!(await this.isInTheRoom(player))) return false;
    return (await this.#roomStateOf(player)).currentGameId === null;
  }

  async playersSeenBy(viewer: string): Promise<PlayerView[]> {
    const { players } = await this.#screenOf(viewer);
    return players.map(({ nickname, avatar }) => ({ nickname, avatar: avatarText(avatar) }));
  }

  async avatarSeenBy(player: string): Promise<string> {
    if (!this.#playerCalled(player).playerId) return avatarText(this.#avatarOnScreen(player));
    const state = await this.#roomStateOf(player);
    const own = state.players.find(({ playerId }) => playerId === state.playerId);
    if (!own) throw new Error(`${player} is not in the room`);
    return avatarText(own.avatar);
  }

  async chooseAnotherAvatar(player: string): Promise<string> {
    const { playerId, previewPlayers } = this.#playerCalled(player);
    const inside = playerId
      ? (await this.#roomStateOf(player)).players.map(({ avatar }) => avatar)
      : previewPlayers.map(({ avatar }) => avatar);
    const taken = new Set([...inside.map(avatarText), await this.avatarSeenBy(player)]);
    const free = AvatarVO.all().find((avatar) => !taken.has(avatarText(avatar)));
    if (!free) throw new Error('The room has no free avatar left');

    await this.chooseAvatar(player, avatarText(free));
    return avatarText(free);
  }

  /** Before entering, the screen keeps it; in the room, the room decides. */
  async chooseAvatar(player: string, avatar: string): Promise<void> {
    const chooser = this.#playerCalled(player);
    const chosen = avatarFrom(avatar);
    if (!chooser.playerId) {
      chooser.avatar = chosen;
      return;
    }
    try {
      await this.#changeAvatar.execute({
        roomId: this.#currentRoomId(),
        playerId: chooser.playerId,
        ...chosen,
      });
      chooser.askedForAnotherAvatar = false;
    } catch (error) {
      if (!(error instanceof NicknameAndAvatarTakenError)) throw error;
      chooser.askedForAnotherAvatar = true;
    }
  }

  async askedToChooseAnotherAvatar(player: string): Promise<boolean> {
    return this.#playerCalled(player).askedForAnotherAvatar;
  }

  async settingsSeenBy(viewer: string): Promise<SettingsView> {
    return (await this.#screenOf(viewer)).settings;
  }

  async changeSettings(host: string, changes: Partial<SettingsView>): Promise<void> {
    await this.#changeRoomSettings.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(host),
      changes: changes as Parameters<ChangeRoomSettingsUseCase['execute']>[0]['changes'],
    });
  }

  /** The application turns down a change from anyone but the host: the screen offers none. */
  async canChangeSettings(player: string): Promise<boolean> {
    return this.#accepts(
      () =>
        this.#changeRoomSettings.execute({
          roomId: this.#currentRoomId(),
          playerId: this.#playerIdOf(player),
          changes: {},
        }),
      NotHostError,
    );
  }

  async roundsSeenBy(viewer: string): Promise<RoundView[]> {
    return (await this.#screenOf(viewer)).rounds.map(roundViewOf);
  }

  /** As the screen does: each round keeps its id in its position, and those beyond are new. */
  async setRounds(host: string, rounds: readonly RoundSetting[]): Promise<void> {
    const current = (await this.#roomStateOf(host)).rounds;
    await this.#changeRounds(
      host,
      rounds.map((round, index) => {
        const id = current[index]?.roundId;
        return id === undefined ? round : { ...round, id };
      }),
    );
  }

  async tryToSetRound(host: string, round: number, setting: RoundSetting): Promise<boolean> {
    const rounds = (await this.#roomStateOf(host)).rounds;
    const id = this.#roundAt(rounds, round).roundId;
    const changes = rounds.map((other) =>
      other.roundId === id ? { ...setting, id } : roundChangeOf(other),
    );
    return this.#accepts(
      () => this.#changeRounds(host, changes),
      DuplicateDilemmaError,
      DilemmaNotSuitableError,
      InvalidRoomSettingError,
    );
  }

  async tryToAddRound(host: string): Promise<boolean> {
    const rounds = (await this.#roomStateOf(host)).rounds.map(roundChangeOf);
    return this.#accepts(
      () =>
        this.#changeRounds(host, [
          ...rounds,
          { origin: 'random', categories: null, content: { age: 'any', compromising: 'any' } },
        ]),
      InvalidRoomSettingError,
    );
  }

  async tryToRemoveRound(host: string, round: number): Promise<boolean> {
    const rounds = (await this.#roomStateOf(host)).rounds;
    const { roundId } = this.#roundAt(rounds, round);
    const changes = rounds.filter((other) => other.roundId !== roundId).map(roundChangeOf);
    return this.#accepts(() => this.#changeRounds(host, changes), InvalidRoomSettingError);
  }

  async chooseRoundDilemma(player: string, round: number, dilemmaId: string): Promise<boolean> {
    const { roundId } = this.#roundAt((await this.#roomStateOf(player)).rounds, round);
    return this.#accepts(
      () =>
        this.#chooseRoundDilemma.execute({
          roomId: this.#currentRoomId(),
          playerId: this.#playerIdOf(player),
          roundId,
          dilemmaId,
        }),
      RoundTakenError,
      RoundNotForPlayersError,
      DuplicateDilemmaError,
      DilemmaNotSuitableError,
    );
  }

  /** The screen offers to choose the dilemma of a round the state shows as the players' and empty. */
  async canChooseRoundDilemma(player: string, round: number): Promise<boolean> {
    const seen = this.#roundAt((await this.#screenOf(player)).rounds, round);
    return seen.origin === 'players' && seen.dilemma === null;
  }

  async clearRoundDilemma(player: string, round: number): Promise<void> {
    const { roundId } = this.#roundAt((await this.#roomStateOf(player)).rounds, round);
    await this.#clearRoundDilemma.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(player),
      roundId,
    });
  }

  /** The screen offers to take out the dilemma of a round to whoever the state says chose it. */
  async canClearRoundDilemma(player: string, round: number): Promise<boolean> {
    const seen = this.#roundAt((await this.#screenOf(player)).rounds, round);
    return seen.origin === 'players' && seen.dilemma !== null && seen.chosenByYou;
  }

  /**
   * Anyone whose id or nickname is in what the viewer has of the rounds. That a dilemma is theirs
   * only tells the one who chose it what they already know.
   */
  async choosersSeenBy(viewer: string): Promise<string[]> {
    const { rounds, players } = await this.#screenOf(viewer);
    const seen = JSON.stringify(rounds);
    return players
      .filter(({ playerId, nickname }) => seen.includes(playerId) || seen.includes(nickname))
      .map(({ nickname }) => nickname);
  }

  async gapWarningSeenBy(viewer: string): Promise<number | undefined> {
    const { rounds, players, minimumPlayersForTheGap } = await this.#screenOf(viewer);
    const withTheGap = rounds.some((round) => round.origin !== 'random' && round.dilemma?.hasGap);
    return withTheGap && players.length < minimumPlayersForTheGap
      ? minimumPlayersForTheGap
      : undefined;
  }

  async playedOnTheirDevice(player: string, dilemmaIds: readonly string[]): Promise<void> {
    const known = this.#introduce(player);
    known.played = [...dilemmaIds];
    if (known.playerId) await this.joinRoom(player);
  }

  async searchDilemmas(player: string, text?: string): Promise<string[]> {
    const { dilemmas } = await this.#searchDilemmas.execute({
      roomId: this.#currentRoomId(),
      identity: this.#playerCalled(player).identity,
      ...(text && { text }),
    });
    return dilemmas.map(({ dilemmaId }) => dilemmaId);
  }

  async searchDilemmaPages(player: string, pages: number): Promise<string[][]> {
    const found: string[][] = [];
    let after: string | undefined;
    for (let page = 0; page < pages; page += 1) {
      const { dilemmas, next } = await this.#searchDilemmas.execute({
        roomId: this.#currentRoomId(),
        identity: this.#playerCalled(player).identity,
        ...(after !== undefined && { after }),
      });
      found.push(dilemmas.map(({ dilemmaId }) => dilemmaId));
      if (next === undefined) break;
      after = next;
    }
    return found;
  }

  catalogEntryOf(dilemmaId: string): CatalogEntry {
    return catalogEntryOf(dilemmaId);
  }

  async expel(host: string, player: string): Promise<void> {
    await this.#expel(host, player);
  }

  /** The application turns down an expulsion it does not allow: the screen offers none. */
  async canExpel(host: string, player: string): Promise<boolean> {
    return this.#accepts(() => this.#expel(host, player), GameInProgressError);
  }

  async startGame(host: string): Promise<void> {
    const { players, minimumPlayers } = await this.#roomStateOf(host);
    for (let count = players.length; count < minimumPlayers; count++) {
      this.#fillers += 1;
      await this.joinRoom(`Filler ${this.#fillers}`);
    }
    await this.#start(host);
  }

  async tryToStartGame(host: string): Promise<void> {
    await this.#accepts(() => this.#start(host), NotEnoughPlayersError, GameInProgressError);
  }

  async currentGameSeenBy(player: string): Promise<string | undefined> {
    return (await this.#roomStateOf(player)).currentGameId ?? undefined;
  }

  async dilemmasOfTheGame(): Promise<string[]> {
    const { dilemmas: played } = await this.#gameStateOf(this.#hostName());
    return played.map(({ dilemmaId }) => dilemmaId);
  }

  /** As the game keeps it: the room may change after the game started. */
  // Ambiences, compromising dilemmas and the content of the rounds

  /** Whether the application creates a room of each ambience for the player, in a room of its own. */
  async ambiencesToCreateWith(player: string): Promise<AmbienceOption[]> {
    return Promise.all(
      AMBIENCES.map(async (ambience) => ({
        ambience,
        described: true,
        offBecause: (await this.#createsARoomOf(player, ambience))
          ? null
          : ('only-adults' as const),
      })),
    );
  }

  /** The application has no ambience it takes unless one is chosen. */
  async ambienceChosenBeforehand(): Promise<boolean> {
    return false;
  }

  async canCreateRoomWithoutAmbience(player: string): Promise<boolean> {
    return this.#createsARoomOf(player, '');
  }

  /** A room of its own, so the room of the scenario stays the only one it has. */
  async #createsARoomOf(player: string, ambience: string): Promise<boolean> {
    const { identity } = this.#playerCalled(player);
    return this.#accepts(
      () =>
        new CreateRoomUseCase(
          new InMemoryRoomRepository(),
          this.#catalog,
          new SequentialIdGenerator(),
          new SequentialRandomness(),
          this.#clock,
          this.#sealProvider,
        ).execute({
          ambience,
          hostNickname: player,
          hostIdentity: identity,
          hostAvatar: { face: 'face-01', color: 'khaki' },
          place: DEFAULT_CHOICES.place,
          dilemmaLanguage: DEFAULT_CHOICES.deviceLanguage,
        }),
      MinorInRoomError,
      InvalidRoomSettingError,
    );
  }

  async ambienceSeenBy(viewer: string): Promise<string> {
    return (await this.#screenOf(viewer)).ambience;
  }

  markAnonymousOnTheOpenSettings(): Promise<void> {
    throw new Error('Only the device keeps settings unsaved: the scenario must be @screen');
  }

  openSettingsSeenBy(): Promise<OpenSettingsView | undefined> {
    throw new Error('Only the device has the settings open: the scenario must be @screen');
  }

  chooseAmbience(): Promise<void> {
    throw new Error('Only the device keeps an ambience unsaved: the scenario must be @screen');
  }

  closeTheOpenSettings(): Promise<void> {
    throw new Error('Only the device has the settings open: the scenario must be @screen');
  }

  /** The settings save what the room server gives the host for that ambience. */
  async saveAmbience(host: string, ambience: Ambience): Promise<void> {
    const { ambiences } = await this.#roomStateOf(host);
    if (!ambiences) throw new Error(`${host} is not given the ambiences, as only the host is`);
    await this.#changeRoomSettings.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(host),
      changes: ambiences[ambience],
    });
  }

  /** Whether the application takes the choice: tried on a copy of the room, which stays as it is. */
  async ambiencesInTheSettings(host: string): Promise<AmbienceOption[]> {
    return Promise.all(
      AMBIENCES.map(async (ambience) => ({
        ambience,
        described: true,
        offBecause: (await this.#onACopyOfTheRoom(host, async (rooms, playerId) => {
          const { ambiences } = await this.#roomStateOf(host);
          return this.#changeSettingsOn(rooms, playerId, ambiences![ambience]);
        }))
          ? null
          : ('minor-in-room' as const),
      })),
    );
  }

  async adultsOnlySwitchSeenBy(host: string): Promise<SwitchView> {
    const on = (await this.#screenOf(host)).settings.adultsOnly;
    const takes = await this.#onACopyOfTheRoom(host, (rooms, playerId) =>
      this.#changeSettingsOn(rooms, playerId, { adultsOnly: true }),
    );
    return { on, offBecause: on || takes ? null : 'minor-in-room' };
  }

  /** The application turns compromising dilemmas off in a room that is not anonymous. */
  async compromisingSwitchSeenBy(host: string): Promise<SwitchView> {
    const on = (await this.#screenOf(host)).settings.compromisingDilemmas;
    const turnedOn = await this.#settingsOnACopy(host, { compromisingDilemmas: true });
    return { on, offBecause: turnedOn.compromisingDilemmas ? null : 'only-anonymous' };
  }

  /** Whether the application keeps a value other than any in each part of the content of that round. */
  async contentChoicesFor(host: string, round: number): Promise<ContentChoices> {
    const asked = { age: 'adults-only', compromising: 'yes' } as const;
    const rounds = (await this.#roomStateOf(host)).rounds.map(roundChangeOf);
    const changed = rounds.map((other, index) =>
      index === round - 1 && other.origin === 'random' ? { ...other, content: asked } : other,
    );
    const set = (await this.#settingsOnACopy(host, { rounds: changed })).rounds[round - 1];
    return {
      age: set?.origin === 'random' && set.content.age === asked.age,
      compromising: set?.origin === 'random' && set.content.compromising === asked.compromising,
    };
  }

  /** The settings a copy of the room takes with the change. */
  async #settingsOnACopy(host: string, changes: RoomSettingsChanges) {
    const rooms = await this.#copyOfTheRoom();
    await this.#changeSettingsOn(rooms, this.#playerIdOf(host), changes);
    const room = await rooms.findById(this.#currentRoomId());
    if (!room) throw new Error('The copy of the room is lost');
    return room.settings.toSnapshot();
  }

  /** Whether the command goes through on a copy of the room, or the application refuses it. */
  async #onACopyOfTheRoom(
    host: string,
    command: (rooms: InMemoryRoomRepository, playerId: string) => Promise<unknown>,
  ): Promise<boolean> {
    const rooms = await this.#copyOfTheRoom();
    return this.#accepts(() => command(rooms, this.#playerIdOf(host)), MinorInRoomError);
  }

  async #copyOfTheRoom(): Promise<InMemoryRoomRepository> {
    const room = await this.#roomRepository.findById(this.#currentRoomId());
    if (!room) throw new Error('The scenario has no room');
    const rooms = new InMemoryRoomRepository();
    await rooms.save(Room.restore(room.toSnapshot()));
    return rooms;
  }

  #changeSettingsOn(rooms: InMemoryRoomRepository, playerId: string, changes: RoomSettingsChanges) {
    return new ChangeRoomSettingsUseCase(
      rooms,
      this.#catalog,
      new InMemoryPlayerNotifier(),
    ).execute({ roomId: this.#currentRoomId(), playerId, changes });
  }

  async searchWithMarks(player: string): Promise<MarkedDilemma[]> {
    const dilemmas = [];
    let after: string | undefined;
    do {
      const page = await this.#searchDilemmas.execute({
        roomId: this.#currentRoomId(),
        identity: this.#playerCalled(player).identity,
        ...(after !== undefined && { after }),
      });
      dilemmas.push(...page.dilemmas);
      after = page.next;
    } while (after !== undefined);
    return dilemmas.map(({ dilemmaId, minimumAge, compromising }) => ({
      dilemmaId,
      markedAdultsOnly: minimumAge === 18,
      markedCompromising: compromising,
    }));
  }

  /** Who is not the host is told, in a room that includes them. */
  async warnedAboutCompromisingDilemmas(player: string): Promise<boolean> {
    const { settings, hostId, playerId } = await this.#screenOf(player);
    return settings.compromisingDilemmas && hostId !== playerId;
  }

  async leaveFromTheWarning(player: string): Promise<void> {
    await this.leave(player);
  }

  /** The search only finds what suits the room. */
  async onlySuitableDilemmasExplainedTo(): Promise<boolean> {
    return true;
  }

  async settingsOfTheGame(): Promise<GameSettingsView> {
    const game = await this.#gameRepository.findById(this.#currentGameId());
    if (!game) throw new Error('The game of the room is not saved');
    return game.settings;
  }

  newDilemmasSetForRandomRounds(count: number): number {
    return explorationSlotsFor(count);
  }

  // Rounds

  async startDecisionPhase(dilemmaCount?: number): Promise<void> {
    const host = this.#hostName();
    const rounds =
      dilemmaCount === undefined
        ? undefined
        : roundsForAGameOf(await this.roundsSeenBy(host), dilemmaCount);
    if (rounds) await this.setRounds(host, rounds);
    await this.startGame(host);

    // Every player has the game open, as their device would after the game starts.
    for (const player of this.#players.keys()) {
      // Who was expelled from the lobby has no room to open.
      if (this.#players.get(player)?.playerId && (await this.isInTheRoom(player))) {
        await this.reconnect(player);
      }
    }
  }

  async messagesReceivedByOthers(player: string): Promise<object[]> {
    const playerId = this.#playerIdOf(player);
    return [...this.#players.values()]
      .map((other) => other.playerId)
      .filter((id): id is string => id !== undefined && id !== playerId)
      .flatMap((id) => this.#notifier.receivedBy(id));
  }

  async votesCastBy(player: string): Promise<string[]> {
    return (this.#votes.get(player) ?? []).map(({ vote }) => vote);
  }

  /** The person in the gap answers on the only screen they have: without a vote. */
  async answer(player: string, plan: AnswerPlan = {}): Promise<void> {
    const dilemma = await this.#roundDilemmaOf(player);
    const { playersToPredict } = await this.#gameStateOf(player);
    const anonymous = (await this.#currentGame()).settings.variant === 'anonymous';
    const predicted = (playerId: string): string => {
      const vote = plan.predictions?.find(
        (prediction) => this.#playerIdOf(prediction.player) === playerId,
      )?.vote;
      return vote ? optionIdOf(dilemma.dilemmaId, vote) : VOTE;
    };
    const aboutThem = await this.aboutThemSeenBy(player);
    const draft = {
      dilemmaId: dilemma.dilemmaId,
      vote: aboutThem ? null : plan.vote ? optionIdOf(dilemma.dilemmaId, plan.vote) : VOTE,
      votePredictions:
        plan.votePredictions === false
          ? []
          : playersToPredict.map((playerId) => ({ playerId, vote: predicted(playerId) })),
      // The screen of an anonymous room starts at the even split and finishes with Ready.
      ...(anonymous && {
        ...(plan.distribution && {
          distributionPrediction: plan.distribution.map(({ option, share }) => ({
            optionId: optionIdOf(dilemma.dilemmaId, option),
            share,
          })),
        }),
        ready: plan.ready ?? true,
      }),
    };
    this.#drafts.set(player, draft);
    await this.#send(player, draft);
  }

  async predictDistribution(
    player: string,
    shares: readonly { readonly option: string; readonly share: number }[],
  ): Promise<void> {
    if (!(await this.#savedAnswerOf(player)) && !(await this.aboutThemSeenBy(player))) {
      await this.vote(player);
    }
    const draft = await this.#draftOrPersonInTheGap(player);
    draft.distributionPrediction = shares.map(({ option, share }) => ({
      optionId: optionIdOf(draft.dilemmaId, option),
      share,
    }));
    await this.#send(player, draft);
  }

  /** The screen moves the bars with the prediction of the domain, and sends it when the player lets go. */
  async moveDistributionShare(player: string, option: number, share: number): Promise<void> {
    const saved = await this.#savedAnswerOf(player);
    if (!saved?.distributionPrediction) throw new Error(`${player} has no distribution prediction`);
    const { options } = await this.#roundDilemmaOf(player);
    const draft = this.#draftOf(player);
    draft.distributionPrediction = [
      ...new DistributionPredictionVO(saved.distributionPrediction).withShare(
        options[option]!.optionId,
        share,
      ).shares,
    ];
    await this.#send(player, draft);
  }

  async pressReady(player: string): Promise<void> {
    const draft = this.#draftOf(player);
    draft.ready = true;
    await this.#send(player, draft);
  }

  /**
   * The application turns down an answer without a vote, prediction or not, as it does the vote
   * predictions: there is no prediction of the distribution without a vote to go with it.
   */
  async canPredictDistribution(player: string): Promise<boolean> {
    const { dilemmaId, options } = await this.#roundDilemmaOf(player);
    return this.#accepts(
      () =>
        this.#answerDilemma.execute({
          roomId: this.#currentRoomId(),
          playerId: this.#playerIdOf(player),
          language: this.#languageOf(player),
          dilemmaId,
          vote: '',
          distributionPrediction: [
            ...DistributionPredictionVO.even(options.map(({ optionId }) => optionId)).shares,
          ],
        }),
      VoteMissingError,
    );
  }

  async distributionPredictionSeenBy(player: string) {
    const saved = await this.#savedAnswerOf(player);
    if (!saved?.distributionPrediction) return undefined;
    const { options } = await this.#roundDilemmaOf(player);
    const prediction = new DistributionPredictionVO(saved.distributionPrediction);
    return {
      shares: options.map(({ optionId }) => prediction.shareOf(optionId)),
      vote: options.findIndex(({ optionId }) => optionId === saved.vote),
    };
  }

  async distributionSlidersSeenBy(): Promise<number> {
    throw new Error('The scenario checks the screen: it must be @screen');
  }

  async rankingSeenBy(viewer: string) {
    return this.#rankingIn(await this.#gameStateOf(viewer));
  }

  /** The ranking of a state, each player with the names of the titles they won. */
  #rankingIn({
    ranking,
    results,
  }: Pick<GetGameStateOutput, 'ranking' | 'results'>): RankedView[] | undefined {
    return ranking?.map(({ playerId, position, points, mentalist }) => ({
      player: this.#nameOf(playerId),
      position,
      points,
      mentalist,
      titles: (results?.titles ?? [])
        .filter(({ winners }) => winners.some(({ playerIds }) => playerIds.includes(playerId)))
        .map(({ title }) => TITLE_NAMES[title]),
    }));
  }

  /** Whether the state of the player has titles won or who knows them best. */
  async titlesSeenBy(viewer: string): Promise<boolean> {
    const { results } = await this.#gameStateOf(viewer);
    return (results?.titles.length ?? 0) > 0 || (results?.knownBestBy ?? null) !== null;
  }

  async resultsScreenSeenBy(viewer: string): Promise<ResultsScreenView | undefined> {
    const { stage, results } = await this.#gameStateOf(viewer);
    if (stage.kind !== 'results') return undefined;
    if ((await this.#currentGame()).settings.variant === 'anonymous') return { kind: 'ranking' };
    const titles = results?.titles ?? [];
    const step = stage.step ?? 0;
    const title = titles[step];
    if (title) {
      return {
        kind: 'title',
        title: TITLE_NAMES[title.title],
        winners: title.winners.map(({ playerIds }) => playerIds.map((id) => this.#nameOf(id))),
        withAvatarsAndFacts: true,
        runnersUp: title.runnersUp.map(({ playerIds }) => playerIds.map((id) => this.#nameOf(id))),
      };
    }
    if (step === titles.length) {
      return {
        kind: 'known-best',
        by: (results?.knownBestBy?.playerIds ?? []).map((id) => this.#nameOf(id)),
      };
    }
    return { kind: 'ranking' };
  }

  async titlesOfTheGame(): Promise<TitleView[]> {
    const { results } = await this.#gameStateOf(this.#hostName());
    return (results?.titles ?? []).map(({ title, winners }) => ({
      title: TITLE_NAMES[title],
      winners: winners.map(({ playerIds }) => playerIds.map((id) => this.#nameOf(id))),
    }));
  }

  async startRematch(host: string): Promise<void> {
    await this.#startRematch.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(host),
    });
  }

  /** The end of the game offers the rematch to the host alone. */
  async canStartRematch(player: string): Promise<boolean> {
    const { stage, hostId } = await this.#gameStateOf(player);
    return stage.kind === 'ended' && hostId === this.#playerIdOf(player);
  }

  async restartGame(host: string): Promise<void> {
    await this.#restartGame.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(host),
    });
  }

  /** The menu of the game offers the host alone to restart it, while its rounds go on. */
  async canRestartGame(player: string): Promise<boolean> {
    const { stage, hostId } = await this.#gameStateOf(player);
    return stage.kind === 'rounds' && hostId === this.#playerIdOf(player);
  }

  async stageOfTheGame(): Promise<string> {
    return (await this.#currentGame()).stage.kind;
  }

  async playedInTheRoom(): Promise<number[]> {
    const room = await this.#roomRepository.findById(this.#currentRoomId());
    const order = (await this.#currentGame()).dilemmas.map(({ dilemmaId }) => dilemmaId);
    return (room?.playedDilemmaIds ?? [])
      .map((dilemmaId) => order.indexOf(dilemmaId) + 1)
      .filter((position) => position > 0)
      .toSorted((a, b) => a - b);
  }

  async roundsWithoutNewDilemmasSeenBy(viewer: string): Promise<number[]> {
    const { rounds } = await this.#roomStateOf(viewer);
    return rounds.flatMap((round, index) =>
      round.origin === 'random' && round.withoutNewDilemmas ? [index + 1] : [],
    );
  }

  async openCard(player: string): Promise<CardView> {
    this.#namesOnTheCard.delete(player);
    return this.#cardOf(player);
  }

  async showNicknamesOnTheCard(player: string): Promise<CardView> {
    this.#namesOnTheCard.add(player);
    return this.#cardOf(player);
  }

  /** What the card of the player says, as the screen puts it together from their state. */
  async #cardOf(player: string): Promise<CardView> {
    const { ranking, results, dilemmas, playerId } = await this.#gameStateOf(player);
    if ((await this.#currentGame()).settings.variant === 'anonymous') {
      const divisive = results?.mostDivisiveDilemma?.dilemmaId;
      const position = dilemmas.findIndex(({ dilemmaId }) => dilemmaId === divisive);
      return {
        headline: `${dilemmas.length} dilemas`,
        titles: [],
        avatarsOf: [],
        nicknamesOf: [],
        mostDivisive: position === -1 ? null : position + 1,
      };
    }
    const mine = ranking?.find((ranked) => ranked.playerId === playerId);
    const won = (results?.titles ?? []).filter(({ winners }) =>
      winners.some(({ playerIds }) => playerIds.includes(playerId)),
    );
    const partners = won
      .filter(({ title }) => title === 'almas-gemelas')
      .flatMap(({ winners }) =>
        winners.flatMap(({ playerIds }) =>
          playerIds.includes(playerId) ? playerIds.filter((other) => other !== playerId) : [],
        ),
      );
    const others = [...new Set([...(results?.knownBestBy?.playerIds ?? []), ...partners])].map(
      (id) => this.#nameOf(id),
    );
    return {
      headline: mine ? `${mine.position}.º de ${ranking?.length ?? 0}` : '',
      titles: won.map(({ title }) => TITLE_NAMES[title]),
      avatarsOf: others,
      nicknamesOf: this.#namesOnTheCard.has(player) ? others : [],
      mostDivisive: null,
    };
  }

  // Reactions and likes

  async react(player: string, to: string | null, emoji = '😂'): Promise<void> {
    const { round } = await this.#gameStateOf(player);
    await this.#react.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(player),
      position: round.position,
      target: to === null ? { kind: 'dilemma' } : { kind: 'vote', playerId: this.#playerIdOf(to) },
      emoji,
    });
  }

  async reactionsSeenBy(viewer: string): Promise<ReactionsView> {
    const { reveal } = await this.#gameStateOf(viewer);
    return {
      dilemma: (reveal?.dilemmaReactions ?? []).map(({ emoji, playerIds, count }) => ({
        emoji,
        by: playerIds.map((id) => this.#nameOf(id)),
        count,
      })),
      votes: (reveal?.voteReactions ?? []).map(({ playerId, aboutId, emoji }) => ({
        by: this.#nameOf(playerId),
        about: this.#nameOf(aboutId),
        emoji,
      })),
    };
  }

  async reactionsRecorded(): Promise<RecordedReaction[]> {
    const game = await this.#currentGame();
    const ids = game.dilemmas.map(({ dilemmaId }) => dilemmaId);
    return game.reactions().map(({ dilemmaId, playerId, aboutId, emoji, seal }) => ({
      by: this.#nameOf(playerId),
      about: aboutId && this.#nameOf(aboutId),
      position: ids.indexOf(dilemmaId) + 1,
      emoji,
      researchConsent: seal.researchConsentVersion !== null,
      commercialLicenceConsent: seal.commercialLicenceConsentVersion !== null,
      underEighteen: seal.underEighteen,
    }));
  }

  async like(player: string): Promise<void> {
    const { round } = await this.#gameStateOf(player);
    await this.#likeDilemma.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(player),
      position: round.position,
    });
  }

  async unlike(player: string, position?: number): Promise<void> {
    const { round } = await this.#gameStateOf(player);
    await this.#unlikeDilemma.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(player),
      position: position === undefined ? round.position : position - 1,
    });
  }

  async likeRecordedFor(player: string, position: number): Promise<RecordedLike | undefined> {
    const dilemmaId = await this.#dilemmaIdAt(position);
    const { identity } = this.#playerCalled(player);
    const like = this.#likes.likes.find(
      (kept) => kept.identity === identity && kept.dilemmaId === dilemmaId,
    );
    return (
      like && {
        researchConsent: like.seal.researchConsentVersion !== null,
        commercialLicenceConsent: like.seal.commercialLicenceConsentVersion !== null,
        underEighteen: like.seal.underEighteen,
      }
    );
  }

  async likesCountedFor(position: number): Promise<number> {
    return this.#likes.weightOf(await this.#dilemmaIdAt(position));
  }

  async likedBefore(player: string, position: number): Promise<void> {
    const { identity } = this.#playerCalled(player);
    await this.#likes.like({
      identity,
      dilemmaId: await this.#dilemmaIdAt(position),
      seal: await this.#sealProvider.sealFor(identity),
      at: this.#clock.now(),
    });
  }

  async timeSpentRecordedFor(position: number): Promise<number | null> {
    const spent = (await this.#currentGame()).timeSpentOn(await this.#dilemmaIdAt(position));
    return spent === null ? null : spent / 1000;
  }

  async endOfTheGameSeenBy(viewer: string) {
    const state = await this.#gameStateOf(viewer);
    const { stage, players, results } = state;
    if (stage.kind !== 'ended') return undefined;
    return {
      stillInTheRoom: players
        .filter(({ left }) => !left)
        .map(({ playerId }) => this.#nameOf(playerId)),
      gone: players.filter(({ left }) => left).map(({ playerId }) => this.#nameOf(playerId)),
      ranking: this.#rankingIn(state) ?? [],
      titles: (results?.titles ?? []).map(({ title, winners }) => ({
        title: TITLE_NAMES[title],
        winners: winners.map(({ playerIds }) => playerIds.map((id) => this.#nameOf(id))),
      })),
    };
  }

  /** The answer the room has of the player to the dilemma of the round, if any. */
  async #savedAnswerOf(player: string) {
    const { dilemmaId } = await this.#roundDilemmaOf(player);
    const { answers } = await this.#gameStateOf(player);
    return answers.find((answer) => answer.dilemmaId === dilemmaId);
  }

  async aboutThemSeenBy(player: string): Promise<boolean> {
    const { personInTheGap } = await this.#roundDilemmaOf(player);
    return personInTheGap === this.#playerIdOf(player);
  }

  /** Whether the application takes a vote of the player for the dilemma of the round. */
  async canVote(player: string): Promise<boolean> {
    const { dilemmaId } = await this.#roundDilemmaOf(player);
    return this.#accepts(
      () =>
        this.#answerDilemma.execute({
          roomId: this.#currentRoomId(),
          playerId: this.#playerIdOf(player),
          language: this.#languageOf(player),
          dilemmaId,
          vote: VOTE,
        }),
      PersonInTheGapVotesError,
      DecisionPhaseOverError,
      DilemmaSkippedError,
    );
  }

  async vote(player: string, option?: string): Promise<void> {
    const { dilemmaId } = await this.#roundDilemmaOf(player);
    const draft = {
      dilemmaId,
      vote: option ? await this.#optionSeenBy(player, dilemmaId, option) : VOTE,
      votePredictions: [],
    };
    this.#drafts.set(player, draft);
    await this.#send(player, draft);
  }

  /** As the room server sends the dilemma of the round to `viewer`. */
  async categorySeenBy(viewer: string): Promise<string> {
    const { round, dilemmas } = await this.#gameStateOf(viewer);
    return dilemmas[round.position]!.category;
  }

  async answerStepsSeenBy(): Promise<AnswerStepsView> {
    throw new Error('Only the device shows the steps of an answer: the scenario must be @screen');
  }

  /** The screen keeps the predictions made and sends them again with the new vote. */
  async changeVote(player: string, option?: string): Promise<void> {
    const { dilemmaId } = await this.#roundDilemmaOf(player);
    const { answers } = await this.#gameStateOf(player);
    const previous = answers.find((answer) => answer.dilemmaId === dilemmaId);
    if (!previous?.vote) throw new Error(`The scenario changes a vote ${player} never cast`);
    const draft = {
      dilemmaId,
      vote: option ? optionIdOf(dilemmaId, option) : previous.vote === VOTE ? OTHER_VOTE : VOTE,
      votePredictions: [...previous.votePredictions],
    };
    this.#drafts.set(player, draft);
    await this.#send(player, draft);
  }

  async votesCastFor(player: string, position: number): Promise<string[]> {
    const dilemmaId = await this.#dilemmaIdAt(position);
    return (this.#votes.get(player) ?? [])
      .filter((cast) => cast.dilemmaId === dilemmaId)
      .map(({ vote }) => vote);
  }

  async curationTeamCreatesADilemma(): Promise<string> {
    const number = this.#curatedCatalog.approved.length + 1;
    this.#curatedCatalog.approved.push({
      number,
      language: 'es',
      name: `Test dilemma ${number}`,
      text: `Text of the curated dilemma ${number}`,
      options: [...SPANISH_OPTION_TEXTS],
      category: 'justice',
      minimumAge: 16,
      tags: [],
      type: 'standard',
      compromising: false,
      scale: 'everyday',
      fixedOrder: false,
    });
    await this.#importCatalog.execute();
    return `dlm-${number}`;
  }

  async dilemmaHasStatus(
    dilemmaId: string,
    status: 'in-catalog' | 'in-exploration',
  ): Promise<boolean> {
    const { dilemmas } = await new SearchCatalogUseCase(this.#dilemmaRepository).execute({
      dilemmaIds: [dilemmaId],
      maximumMinimumAge: 18,
      status,
      language: 'es',
      includeCompromising: false,
      size: 1,
    });
    return dilemmas.length === 1;
  }

  async catalogDilemmaNamed(
    name: string,
    {
      minimumAge = 16,
      compromising = false,
    }: { readonly minimumAge?: 16 | 18; readonly compromising?: boolean } = {},
  ): Promise<void> {
    const number = this.#curatedCatalog.approved.length + this.#curatedCatalog.discarded.length + 1;
    this.#publicNumbers.set(name, number);
    this.#curatedCatalog.approved.push({
      number,
      language: 'es',
      name,
      text: `Dilema público ${number}: ${name}`,
      options: [...SPANISH_OPTION_TEXTS],
      category: 'life-and-death',
      minimumAge,
      tags: [],
      type: 'standard',
      compromising,
      scale: 'everyday',
      fixedOrder: false,
    });
    await this.#importCatalog.execute();
  }

  /**
   * A dilemma with all a page needs, an id of the curated catalog and its arguments reviewed, but
   * private or in exploration, so that is all that keeps it off the web. Its number is far beyond
   * those the scenario imports.
   */
  async dilemmaOutsideTheCatalogNamed(
    name: string,
    kind: 'private' | 'in-exploration',
  ): Promise<void> {
    const number = 9000 + this.#publicNumbers.size + 1;
    this.#publicNumbers.set(name, number);
    const id = `dlm-${number}`;
    await this.#dilemmaRepository.save(
      Dilemma.restore({
        id,
        publicId: `${id}-public`,
        language: 'es',
        name,
        creator: { type: 'player', identity: 'TestCreatorIdentity' },
        visibility: kind === 'private' ? 'private' : 'public',
        version: {
          number: 1,
          text: `Texto de ${name}`,
          options: SPANISH_OPTION_TEXTS.map((text, index) => ({
            id: `${id}-option-${index + 1}`,
            text,
          })),
          category: 'life-and-death',
          tags: [],
          minimumAge: 16,
          type: 'standard',
          compromising: false,
          scale: 'everyday',
          fixedOrder: false,
          status: kind === 'private' ? 'in-catalog' : 'in-exploration',
          arguments: {
            options: SPANISH_OPTION_TEXTS.map((text, index) => ({
              optionId: `${id}-option-${index + 1}`,
              for: `A favor de ${text}`,
              against: `En contra de ${text}`,
            })),
          },
        },
      }),
    );
  }

  async reviewArgumentsOf(name: string): Promise<void> {
    const index = this.#curatedCatalog.approved.findIndex((curated) => curated.name === name);
    const curated = this.#curatedCatalog.approved[index]!;
    this.#curatedCatalog.approved[index] = {
      ...curated,
      arguments: {
        context: `Contexto de ${name}`,
        options: curated.options.map((option) => ({
          for: `A favor de ${option}`,
          against: `En contra de ${option}`,
        })),
      },
    };
    await this.#importCatalog.execute();
  }

  async removeFromTheCatalog(name: string): Promise<void> {
    const index = this.#curatedCatalog.approved.findIndex((curated) => curated.name === name);
    const [removed] = this.#curatedCatalog.approved.splice(index, 1);
    this.#curatedCatalog.discarded.push(removed!.number);
    await this.#importCatalog.execute();
  }

  async generatePublicPages(): Promise<void> {
    const catalog = await new GetPublicCatalogUseCase(this.#dilemmaRepository).execute();
    this.#site = buildSite(catalog, SITE_LANGUAGES, {
      origin: SITE_ORIGIN,
      appBase: '',
      owner: { name: 'TestOwner', taxId: 'TestTaxId', address: 'TestAddress' },
      donationUrl: DONATION_URL,
    });
    await publishSite(this.#site, this.#siteFiles);
  }

  async donationLinksOn(
    which: 'home' | 'category' | { readonly dilemma: string },
  ): Promise<DonationLinks> {
    const path =
      which === 'home'
        ? '/es/'
        : which === 'category'
          ? this.#site?.pages.find(
              (page) => page.language === 'es' && page.indexable && !page.home && !page.dilemma,
            )?.path
          : this.#publicPathOf(which.dilemma);
    if (!path) throw new Error('The public web has no such page');
    const { body = '' } = await this.#answerOfThePublicWeb(path);
    // The link, as the page writes it: to the donation page of the environment.
    const link = `href="${DONATION_URL}"`;
    const footer = body.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? '';
    const beforeTheFooter =
      body.match(/<section class="support"[\s\S]*?<\/section>\s*<\/div>\s*<\/main>/)?.[0] ?? '';
    const afterTheArguments =
      body.match(/class="dilemma-arguments"[\s\S]*?<p class="support-line">[\s\S]*?<\/p>/)?.[0] ??
      '';
    return {
      inTheFooter: footer.includes(link),
      beforeTheFooter: beforeTheFooter.includes(link),
      afterTheArguments: afterTheArguments.includes(link),
    };
  }

  async publicPageOf(name: string, language: string): Promise<PublicPageView | undefined> {
    const page = this.#publicPageIn(name, language);
    return page && publicPageViewOf(page);
  }

  async switchLanguageOfThePublicPage(name: string, language: string): Promise<PublicPageView> {
    const path = this.#publicPageIn(name, 'es')!.alternates[language];
    const page = this.#site?.pages.find((candidate) => candidate.path === path);
    if (!page) throw new Error(`The public page of "${name}" has no version in ${language}`);
    return publicPageViewOf(page);
  }

  async statusOfThePublicPageOf(name: string): Promise<number> {
    return (await this.#answerOfThePublicWeb(this.#publicPathOf(name))).status;
  }

  async sitemapIncludes(name: string): Promise<boolean> {
    const sitemap = await this.#answerOfThePublicWeb('/sitemap.xml');
    return sitemap.body?.includes(`${SITE_ORIGIN}${this.#publicPathOf(name)}<`) ?? false;
  }

  async playWithTheGroupFromThePublicPage(name: string, language = 'es'): Promise<void> {
    // The visitor follows the link of the page, as it is written: to the dilemma, in its language.
    const page = this.#publicPageIn(name, language);
    const href = page?.main.value.match(/href="([^"]*\/new\/[^"]*)"/)?.[1];
    if (!href) throw new Error(`"${name}" has no public page in ${language} to play it from`);
    const link = new URL(href, SITE_ORIGIN);
    this.#appLanguage = link.searchParams.get('lang') ?? undefined;
    this.#dilemmaToPlay = await new GetDilemmaPreviewUseCase(this.#dilemmaRepository).execute({
      publicId: link.pathname.split('/').at(-1)!,
    });
  }

  async visitorWithoutAChosenLanguage(): Promise<void> {
    // The application keeps no language of the player yet: the app takes the one of the link.
  }

  async openSettings(): Promise<void> {
    throw new Error('Only the device shows the settings: the scenario must be @screen');
  }

  async chooseTheLanguageOfTheApp(): Promise<void> {
    throw new Error('Only the device shows the settings: the scenario must be @screen');
  }

  async languageShownTo(): Promise<string | undefined> {
    throw new Error('Only the device shows the settings: the scenario must be @screen');
  }

  async settingsOfferTheAge(): Promise<boolean> {
    throw new Error('Only the device shows the settings: the scenario must be @screen');
  }

  async fundingSeenInTheSettings(): Promise<FundingView> {
    throw new Error('Only the device shows the settings: the scenario must be @screen');
  }

  async firstRowOfTheSettings(): Promise<{ readonly donation: boolean; readonly href?: string }> {
    throw new Error('Only the device shows the settings: the scenario must be @screen');
  }

  async creditsSeenInTheSettings(): Promise<CreditsView> {
    throw new Error('Only the device shows the settings: the scenario must be @screen');
  }

  async muteInTheSettings(): Promise<void> {
    throw new Error('Only the device shows the settings: the scenario must be @screen');
  }

  donationPage(): string {
    return DONATION_URL;
  }

  async languageOfTheApp(): Promise<string | undefined> {
    return this.#appLanguage;
  }

  async bannerAdBelowTheArguments(): Promise<boolean> {
    throw new Error('Only the screen shows the ads: the scenario must be @screen');
  }

  async voteFromThePublicPage(name: string): Promise<void> {
    // The visitor follows the link of the page, as it is written, to the dilemma to vote alone.
    const page = this.#publicPageIn(name, 'es');
    const href = page?.main.value.match(/href="([^"]*\/vote\/[^"]*)"/)?.[1];
    if (!href) throw new Error(`The public page of "${name}" offers no vote`);
    const link = new URL(href.replaceAll('&amp;', '&'), SITE_ORIGIN);
    // The link opens the app: on a device that never used TheLever, at its first access.
    if (this.#devices.has(VISITOR_IDENTITY)) await this.openApp(VISITOR);
    this.#dilemmaToVote = await new GetDilemmaPreviewUseCase(this.#dilemmaRepository).execute({
      publicId: link.pathname.split('/').at(-1)!,
    });
  }

  async dilemmaReadyToVoteAlone(): Promise<string | undefined> {
    // The room server takes no vote alone before the first access is done.
    if (this.#devices.has(VISITOR_IDENTITY) && !(await this.canUseTheApp(VISITOR))) {
      return undefined;
    }
    const preview = this.#dilemmaToVote;
    return preview && preview.options.length > 1 ? preview.name : undefined;
  }

  async openTheAppToVoteAlone(name: string): Promise<void> {
    const publicId = await this.#publicIdOf(name);
    try {
      this.#dilemmaToVote = await new GetDilemmaPreviewUseCase(this.#dilemmaRepository).execute({
        publicId,
      });
      this.#dilemmaToVoteUnavailable = false;
    } catch (error) {
      if (!(error instanceof DilemmaNotFoundError)) throw error;
      this.#dilemmaToVote = undefined;
      this.#dilemmaToVoteUnavailable = true;
    }
  }

  async dilemmaToVoteIsUnavailable(): Promise<boolean> {
    return this.#dilemmaToVoteUnavailable;
  }

  async visitorOnANewDevice(): Promise<void> {
    await this.newDevice(VISITOR, { country: 'ES' });
  }

  async firstAccessScreenOfTheVisitor(): Promise<FirstAccessScreen> {
    return this.firstAccessScreenOf(VISITOR);
  }

  async visitorFinishesTheFirstAccess(): Promise<void> {
    await this.declareAge(VISITOR, 30);
    await this.acceptTerms(VISITOR);
    await this.giveGameConsent(VISITOR);
    await this.answerCookieConsent(VISITOR);
  }

  async voteAlone(name: string): Promise<void> {
    const publicId = await this.#publicIdOf(name);
    const { options } = await new GetDilemmaPreviewUseCase(this.#dilemmaRepository).execute({
      publicId,
    });
    const optionId = options[0]!.optionId;
    await new VoteAloneUseCase(this.#dilemmaRepository, this.#worldResults).execute({
      identity: VISITOR_IDENTITY,
      publicId,
      optionId,
    });
    this.#visitorVote = optionId;
    this.#worldResultSeen = await new GetWorldResultUseCase(
      this.#dilemmaRepository,
      this.#worldResults,
    ).execute({ publicId, optionId, prediction: 50 });
  }

  async worldAnswersOf(name: string): Promise<number> {
    // The answers counted so far, which the daily publication shows once there are enough new
    // ones: a single vote is counted at once, and published with the next ones.
    const number = this.#publicNumbers.get(name);
    return [...this.#worldResults.records().counts]
      .filter(([key]) => (JSON.parse(key) as [string])[0] === `dlm-${number}`)
      .reduce((total, [, count]) => total + count, 0);
  }

  async voteOfTheVisitorIsKept(): Promise<boolean> {
    // Nothing kept ties the identity of the visitor to the option they voted: the receipt has no
    // option, and the counts have no identity.
    const vote = this.#visitorVote;
    if (!vote) throw new Error('The visitor voted nothing alone');
    const { receipts, counts } = this.#worldResults.records();
    const receiptsOfTheVisitor = receipts.filter(({ identity }) => identity === VISITOR_IDENTITY);
    if (receiptsOfTheVisitor.length === 0) {
      throw new Error('The vote of the visitor was not counted');
    }
    return (
      JSON.stringify(receiptsOfTheVisitor).includes(vote) ||
      [...counts.keys()].some((key) => key.includes(VISITOR_IDENTITY))
    );
  }

  async dilemmaWithWorldAnswers(name: string, answers: number): Promise<void> {
    await this.catalogDilemmaNamed(name);
    const publicId = await this.#publicIdOf(name);
    const { options } = await new GetDilemmaPreviewUseCase(this.#dilemmaRepository).execute({
      publicId,
    });
    const voteAlone = new VoteAloneUseCase(this.#dilemmaRepository, this.#worldResults);
    for (let voter = 0; voter < answers; voter += 1) {
      await voteAlone.execute({
        identity: `world-voter-${voter}`,
        publicId,
        optionId: options[voter % options.length]!.optionId,
      });
    }
    await new PublishWorldResultsUseCase(this.#worldResults).execute();
  }

  async worldResultSeen(): Promise<WorldResultView> {
    const result = this.#worldResultSeen;
    if (!result) throw new Error('The visitor saw no world result');
    return result.shown
      ? { tooFewAnswers: false, figures: result.options.map(({ percentage }) => `${percentage} %`) }
      : { tooFewAnswers: true, figures: [] };
  }

  /** The public id of the dilemma of the curated catalog with that name, in Spanish. */
  async #publicIdOf(name: string): Promise<string> {
    const number = this.#publicNumbers.get(name);
    const dilemma = number && (await this.#dilemmaRepository.findById(`dlm-${number}`));
    if (!dilemma) throw new Error(`"${name}" is not a dilemma of the curated catalog`);
    return dilemma.publicId;
  }

  async createTheRoomOfTheDilemma(ambience: Ambience = 'classic'): Promise<void> {
    const preview = this.#dilemmaToPlay;
    if (!preview) throw new Error('The visitor chose no dilemma to play with the group');
    const catalog = new PublishedDilemmasCatalog(
      new GetDilemmasUseCase(this.#dilemmaRepository),
      new SearchCatalogUseCase(this.#dilemmaRepository),
      new FindCandidatesUseCase(this.#dilemmaRepository),
    );
    const { roomId, hostId } = await new CreateRoomUseCase(
      this.#roomRepository,
      catalog,
      new SequentialIdGenerator(),
      new SequentialRandomness(),
      this.#clock,
      this.#sealProvider,
    ).execute({
      ambience,
      hostNickname: VISITOR,
      hostIdentity: VISITOR_IDENTITY,
      hostAvatar: { face: 'face-01', color: 'khaki' },
      place: DEFAULT_CHOICES.place,
      dilemmaLanguage: preview.language,
      firstRoundDilemmaId: preview.dilemmaId,
    });
    this.#visitorRoomId = roomId;
    this.#visitorHostId = hostId;
  }

  async roundsOfTheVisitorRoom(): Promise<RoundView[]> {
    return (await this.#stateOfTheVisitorRoom()).rounds.map(roundViewOf);
  }

  async ambienceOfTheVisitorRoom(): Promise<string> {
    return (await this.#stateOfTheVisitorRoom()).ambience;
  }

  async #stateOfTheVisitorRoom() {
    const roomId = this.#visitorRoomId;
    const playerId = this.#visitorHostId;
    if (!roomId || !playerId) throw new Error('The visitor created no room');
    return this.#getRoomState.execute({
      roomId,
      playerId,
      language: DEFAULT_CHOICES.deviceLanguage,
    });
  }

  /** What the screen gets of the dilemma the visitor came from, before the room exists. */
  async startingDilemmaShownToTheVisitor(): Promise<string | undefined> {
    return this.#dilemmaToPlay?.name;
  }

  async firstRoundDilemmaOfTheVisitorRoom(): Promise<string | undefined> {
    const room = this.#visitorRoomId && (await this.#roomRepository.findById(this.#visitorRoomId));
    const [first] = room ? room.settings.rounds : [];
    if (first?.origin !== 'specific') return undefined;
    const { dilemmaId } = first.dilemma;
    return this.#curatedCatalog.approved.find(({ number }) => `dlm-${number}` === dilemmaId)?.name;
  }

  /** The page of the dilemma of the public web in that language, as the job generated it. */
  #publicPageIn(name: string, language: string): Page | undefined {
    const number = this.#publicNumbers.get(name);
    return this.#site?.pages.find(
      ({ dilemma }) => dilemma?.number === number && dilemma?.language === language,
    );
  }

  /** The address the page of the dilemma has in Spanish, or had before it was withdrawn. */
  #publicPathOf(name: string): string {
    const category = SITE_LANGUAGES.get('es')!.categories['life-and-death'].name;
    return dilemmaPath('es', category, name, this.#publicNumbers.get(name)!);
  }

  async #answerOfThePublicWeb(path: string) {
    const site = await publishedSite(this.#siteFiles);
    if (!site) throw new Error('The public pages were never generated');
    return respond(path, site, {
      environment: 'prod',
      origin: SITE_ORIGIN,
      languages: [...SITE_LANGUAGES.keys()],
    });
  }

  async languageOfTheRoom(): Promise<string> {
    const room = await this.#roomRepository.findById(this.#currentRoomId());
    if (!room) throw new Error('The room of the scenario is not saved');
    return room.settings.dilemmaLanguage;
  }

  /** What the room server takes to change the settings: the language never goes through. */
  async settingsOfferALanguage(): Promise<boolean> {
    return ClientMessageDto.safeParse({
      type: 'change-settings',
      changes: { dilemmaLanguage: 'en' },
    }).success;
  }

  async roundTextSeenBy(viewer: string, round: number): Promise<string | undefined> {
    const seen = (await this.#roomStateOf(viewer)).rounds[round - 1];
    if (seen?.origin === 'specific') return seen.dilemma.text;
    if (seen?.origin === 'players') return seen.dilemma?.text;
    return undefined;
  }

  async languageReadBy(player: string, position: number): Promise<string | null> {
    const dilemmaId = await this.#dilemmaIdAt(position);
    const answer = (await this.#currentGame())
      .answersOf(this.#playerIdOf(player))
      .find((candidate) => candidate.dilemmaId === dilemmaId);
    return answer?.language ?? null;
  }

  usesTheAppIn(player: string, language: string): Promise<void> {
    this.#languages.set(player, language);
    return Promise.resolve();
  }

  async optionOfTheRoomCalled(position: number, text: string): Promise<string> {
    return optionIdOf(await this.#dilemmaIdAt(position), text);
  }

  async voteRecordedFor(player: string, position: number): Promise<string | undefined> {
    const { answers } = await this.#gameStateOf(player);
    const dilemmaId = await this.#dilemmaIdAt(position);
    return answers.find((answer) => answer.dilemmaId === dilemmaId)?.vote ?? undefined;
  }

  /** Whether the application takes an answer of the player for the dilemma of the round. */
  async canAnswer(player: string): Promise<boolean> {
    const { dilemmaId } = await this.#roundDilemmaOf(player);
    return this.#accepts(
      () =>
        this.#answerDilemma.execute({
          roomId: this.#currentRoomId(),
          playerId: this.#playerIdOf(player),
          language: this.#languageOf(player),
          dilemmaId,
          vote: VOTE,
        }),
      DecisionPhaseOverError,
      DilemmaSkippedError,
    );
  }

  async hasAnswered(player: string): Promise<boolean> {
    return (await this.#currentGame()).hasAnswered(this.#playerIdOf(player));
  }

  async answeredSeenBy(viewer: string, player: string): Promise<boolean | null> {
    const { players } = await this.#gameStateOf(viewer);
    const seen = players.find(({ playerId }) => playerId === this.#playerIdOf(player));
    if (!seen) throw new Error(`${viewer} does not see ${player} in the game`);
    return seen.answered;
  }

  async answeredCountSeenBy(viewer: string): Promise<number> {
    return (await this.#gameStateOf(viewer)).answeredCount;
  }

  /** Who answered travels as the progress of a player, or as whether each one answered. */
  async whoAnsweredIsSent(): Promise<boolean> {
    for (const [name, { playerId }] of this.#players) {
      if (!playerId) continue;
      if (
        this.#notifier.receivedBy(playerId).some((event) => event instanceof ProgressUpdatedEvent)
      ) {
        return true;
      }
      const { players } = await this.#gameStateOf(name);
      if (players.some(({ answered }) => answered !== null)) return true;
    }
    return false;
  }

  async isWaiting(player: string): Promise<boolean> {
    const { round } = await this.#gameStateOf(player);
    return round.phase === 'decision' && (await this.hasAnswered(player));
  }

  async timeLeftSeenBy(viewer: string): Promise<number> {
    const { round } = await this.#gameStateOf(viewer);
    return Math.round((round.endsAt.getTime() - this.#clock.now().getTime()) / 1000);
  }

  async disconnect(player: string): Promise<void> {
    const connected = this.#playerCalled(player);
    if (!connected.connectionId) {
      throw new Error(`The scenario disconnects ${player}, who is not connected`);
    }
    await this.#disconnectPlayer.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(player),
      connectionId: connected.connectionId,
    });
    connected.connectionId = undefined;
  }

  async reconnect(player: string): Promise<void> {
    const connecting = this.#playerCalled(player);
    const { connectionId } = await this.#connectPlayer.execute({
      roomId: this.#currentRoomId(),
      identity: connecting.identity,
    });
    connecting.connectionId = connectionId;
  }

  async tryToReconnect(player: string): Promise<boolean> {
    try {
      await this.reconnect(player);
      return true;
    } catch (error) {
      if (error instanceof RoomClosedError) return false;
      throw error;
    }
  }

  async dilemmaShownTo(player: string): Promise<number> {
    return (await this.#gameStateOf(player)).round.position + 1;
  }

  /** What `viewer` knows about the connection of `player`: the last change they received. */
  async connectionSeenBy(viewer: string, player: string): Promise<boolean | undefined> {
    const playerId = this.#playerIdOf(player);
    const changes = this.#notifier
      .receivedBy(this.#playerIdOf(viewer))
      .filter((event) => event instanceof ConnectionChangedEvent)
      .filter((event) => event.playerId === playerId);
    return changes.at(-1)?.connected;
  }

  async dilemmaTextSeenBy(player: string, position: number): Promise<string> {
    const state = await this.#gameStateOf(player);
    const dilemma = state.dilemmas[position - 1];
    if (!dilemma) throw new Error(`The game has no dilemma in position ${position}`);
    const person = state.players.find(({ playerId }) => playerId === dilemma.personInTheGap);
    return person ? dilemma.text.replaceAll(GAP_MARKER, person.nickname) : dilemma.text;
  }

  async optionsSeenBy(player: string, position: number): Promise<string[]> {
    const dilemma = (await this.#gameStateOf(player)).dilemmas[position - 1];
    if (!dilemma) throw new Error(`The game has no dilemma in position ${position}`);
    return dilemma.options.map(({ text }) => text);
  }

  async peopleInTheGap(): Promise<Map<number, string>> {
    const { dilemmas } = await this.#gameStateOf(this.#hostName());
    return new Map(
      dilemmas.flatMap(({ personInTheGap }, index) =>
        personInTheGap ? [[index + 1, this.#nameOf(personInTheGap)] as const] : [],
      ),
    );
  }

  async positionChosenBy(player: string): Promise<number> {
    const playerId = this.#playerIdOf(player);
    const index = (await this.#currentGame()).dilemmas.findIndex(
      ({ chosenBy }) => chosenBy === playerId,
    );
    if (index === -1) throw new Error(`${player} chose no dilemma of the game`);
    return index + 1;
  }

  /** The game keeps the id of the dilemma; its text stays in Dilemmas, as it was written. */
  async textKeptFor(position: number): Promise<string> {
    const game = await this.#currentGame();
    const played = game.dilemmas[position - 1];
    if (!played) throw new Error(`The game has no dilemma in position ${position}`);
    // In the language of the room, as it was written.
    const [content] = await this.#catalog.findContents([played], game.settings.dilemmaLanguage);
    return content!.text;
  }

  async answerRecordedFor(player: string, position: number): Promise<RecordedAnswer | undefined> {
    const game = await this.#currentGame();
    const dilemmaId = await this.#dilemmaIdAt(position);
    const answer = game
      .answersOf(this.#playerIdOf(player))
      .find((recorded) => recorded.dilemmaId === dilemmaId);
    if (!answer) return undefined;
    return {
      vote: answer.vote && optionTextOf(dilemmaId, answer.vote),
      votePredictions: answer.votePredictions.map((prediction) => ({
        player: this.#nameOf(prediction.playerId),
        vote: optionTextOf(dilemmaId, prediction.vote),
      })),
      optionOrder: answer.optionOrder.map((optionId) => optionTextOf(dilemmaId, optionId)),
      responseTimeSeconds: answer.responseTimeMs === null ? null : answer.responseTimeMs / 1000,
      distributionPrediction:
        answer.distributionPrediction?.map(({ optionId, share }) => ({
          option: optionTextOf(dilemmaId, optionId),
          share,
        })) ?? null,
      researchConsent: answer.seal.researchConsentVersion !== null,
      commercialLicenceConsent: answer.seal.commercialLicenceConsentVersion !== null,
      underEighteen: answer.seal.underEighteen,
    };
  }

  async didNotVoteRecordedFor(player: string): Promise<number[]> {
    const game = await this.#currentGame();
    const positions = game.dilemmas.map(({ dilemmaId }) => dilemmaId);
    return game
      .didNotVoteOf(this.#playerIdOf(player))
      .map(({ dilemmaId }) => positions.indexOf(dilemmaId) + 1);
  }

  async everythingPlayersSee(): Promise<object[]> {
    const seen: object[] = [];
    for (const [name, { playerId }] of this.#players) {
      if (!playerId) continue;
      seen.push(...this.#notifier.receivedBy(playerId), await this.#gameStateOf(name));
    }
    return seen;
  }

  /** The seal the player gets from now on, as the first access would leave it. */
  async declare(player: string, { underEighteen, researchConsent }: Declaration): Promise<void> {
    this.#seals.set(this.#playerCalled(player).identity, {
      gameConsentVersion: GAME_CONSENT_VERSION,
      researchConsentVersion: researchConsent ? '1' : null,
      commercialLicenceConsentVersion: null,
      underEighteen,
    });
  }

  async letTimePass(seconds: number): Promise<void> {
    this.#clock.advance(seconds * 1000);
  }

  async deleteClosedRooms(): Promise<void> {
    await this.#deleteClosedRooms.execute();
  }

  async isGameDataKept(): Promise<boolean> {
    const room = await this.#roomRepository.findById(this.#currentRoomId());
    const game = this.#gameId && (await this.#gameRepository.findById(this.#gameId));
    return room !== undefined || Boolean(game);
  }

  /** The time is over, and the room server runs it out as its timer would. */
  async runOutRound(): Promise<void> {
    const endsAt = (await this.#currentGame()).round?.endsAt;
    if (!endsAt) throw new Error('The game has no round in progress');
    this.#clock.advance(Math.max(0, endsAt.getTime() - this.#clock.now().getTime()));
    await this.#runOutRound.execute({ roomId: this.#currentRoomId() });
  }

  async revealEarly(host: string): Promise<void> {
    await this.#revealEarly.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(host),
    });
  }

  /** The application lets the host reveal a dilemma early: the screen offers it to them. */
  async canRevealEarly(player: string): Promise<boolean> {
    const { hostId, playerId } = await this.#gameStateOf(player);
    return hostId === playerId;
  }

  /** The reveal the application gives `viewer`, with only their own predictions, as the screen does. */
  async ownPredictionsSeenBy(viewer: string): Promise<{ about: string; right: boolean }[]> {
    const reveal = await this.revealSeenBy(viewer);
    const voted = new Set(
      (reveal?.votes ?? []).flatMap(({ player, vote }) => (vote === null ? [] : player)),
    );
    return (reveal?.votePredictions ?? [])
      .filter(({ player, about }) => player === viewer && voted.has(about))
      .map(({ about, right }) => ({ about, right }));
  }

  async revealSeenBy(viewer: string): Promise<RevealView | undefined> {
    const { reveal, ranking } = await this.#gameStateOf(viewer);
    if (!reveal) return undefined;
    const { dilemmaId } = reveal;
    return {
      position: reveal.position + 1,
      distribution:
        reveal.distribution?.map(({ optionId, count }) => ({
          option: optionTextOf(dilemmaId, optionId),
          count,
        })) ?? null,
      tooFewVotes: reveal.tooFewVotes,
      didNotVoteCount: reveal.didNotVoteCount,
      votes: reveal.votes.map(({ playerId, vote }) => ({
        player: this.#nameOf(playerId),
        vote: vote && optionTextOf(dilemmaId, vote),
      })),
      votePredictions: reveal.votePredictions.map(({ playerId, aboutId, right }) => ({
        player: this.#nameOf(playerId),
        about: this.#nameOf(aboutId),
        right,
      })),
      personInTheGap: reveal.personInTheGap && this.#nameOf(reveal.personInTheGap),
      personInTheGapHits: reveal.personInTheGapHits,
      chosenBy: reveal.chosenBy && this.#nameOf(reveal.chosenBy),
      showsPoints: ranking !== null,
      ownDistributionPrediction:
        reveal.yourDistributionPrediction?.map(({ optionId, share }) => ({
          option: optionTextOf(dilemmaId, optionId),
          share,
        })) ?? null,
      ownPoints: reveal.yourPoints,
    };
  }

  async getReadyToMoveOn(player: string): Promise<void> {
    await this.#getReadyToMoveOn.execute(await this.#moveOnBy(player));
  }

  /**
   * All tap at once, from where each of them sees the group: the room server takes the commands of
   * a room one after another, so they arrive in some order.
   */
  async getReadyToMoveOnTogether(players: readonly string[]): Promise<void> {
    const moves = await Promise.all(players.map((player) => this.#moveOnBy(player)));
    for (const move of moves) await this.#getReadyToMoveOn.execute(move);
  }

  async moveEveryoneOn(host: string): Promise<void> {
    await this.#moveOn.execute(await this.#moveOnBy(host));
  }

  /** Whether the room server takes everyone on when `player` asks it to. */
  async canMoveEveryoneOn(player: string): Promise<boolean> {
    try {
      await this.moveEveryoneOn(player);
      return true;
    } catch (error) {
      if (error instanceof NotHostError) return false;
      throw error;
    }
  }

  /** Of the players connected and still in the game, how many are ready to move on. */
  async readyToMoveOnSeenBy(
    viewer: string,
  ): Promise<{ readonly ready: number; readonly of: number } | null> {
    const { players, readyToMoveOn } = await this.#gameStateOf(viewer);
    const present = players.filter(({ connected, left }) => connected && !left);
    const ready = present.filter(({ playerId }) => readyToMoveOn.includes(playerId)).length;
    return ready > 0 ? { ready, of: present.length } : null;
  }

  /** From the round `player` sees, or from the screen of the game results, which come after the last round. */
  async #moveOnBy(player: string) {
    const { round, stage, dilemmas } = await this.#gameStateOf(player);
    return {
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(player),
      fromPosition: stage.kind === 'results' ? dilemmas.length + (stage.step ?? 0) : round.position,
    };
  }

  /** The host who moved everyone to the round they are on or, in the results, to the screen they are on. */
  async movedOnSeenBy(viewer: string): Promise<string | null> {
    const { round, stage } = await this.#gameStateOf(viewer);
    const movedOnBy = stage.kind === 'rounds' ? round.movedOnBy : stage.movedOnBy;
    return movedOnBy && this.#nameOf(movedOnBy);
  }

  async moveOnNoticeCoversNothing(): Promise<boolean> {
    throw new Error('The scenario checks the screen: it must be @screen');
  }

  async moveOnNoticeDisappears(): Promise<boolean> {
    throw new Error('The scenario checks the screen: it must be @screen');
  }

  /** The application has no command to go back to a past round, and only gives the round in progress. */
  async canGoBack(): Promise<boolean> {
    return false;
  }

  /** The application turns down predictions without a vote: the screen offers none. */
  async canMakePredictions(player: string): Promise<boolean> {
    const { dilemmaId } = await this.#roundDilemmaOf(player);
    const { playersToPredict } = await this.#gameStateOf(player);
    return this.#accepts(
      () =>
        this.#answerDilemma.execute({
          roomId: this.#currentRoomId(),
          playerId: this.#playerIdOf(player),
          language: this.#languageOf(player),
          dilemmaId,
          vote: '',
          votePredictions: playersToPredict.map((playerId) => ({ playerId, vote: VOTE })),
        }),
      VoteMissingError,
    );
  }

  async predictVotes(
    player: string,
    predictions: readonly { readonly player: string; readonly vote: string }[],
  ): Promise<void> {
    const draft = await this.#draftOrPersonInTheGap(player);
    draft.votePredictions = predictions.map((prediction) => ({
      playerId: this.#playerIdOf(prediction.player),
      vote: optionIdOf(draft.dilemmaId, prediction.vote),
    }));
    await this.#send(player, draft);
  }

  async playersToPredictBy(player: string): Promise<string[]> {
    const { playersToPredict } = await this.#gameStateOf(player);
    return playersToPredict.map((playerId) => this.#nameOf(playerId));
  }

  async pointsOf(
    player: string,
  ): Promise<{ readonly position: number; readonly points: number | null }[]> {
    const game = await this.#currentGame();
    const positions = game.dilemmas.map(({ dilemmaId }) => dilemmaId);
    return game.pointsOf(this.#playerIdOf(player)).map(({ dilemmaId, points }) => ({
      position: positions.indexOf(dilemmaId) + 1,
      points,
    }));
  }

  async report(player: string, reason: ReportReason, comment?: string): Promise<ReportedDilemma> {
    const { dilemmaId } = await this.#roundDilemmaOf(player);
    await this.#reportDilemma.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(player),
      dilemmaId,
      reason: REPORT_REASONS[reason],
      language: this.#languageOf(player),
      ...(comment !== undefined && { comment }),
    });
    this.#toldOfReview.add(player);
    return this.#reportedDilemma(dilemmaId);
  }

  async canReport(player: string): Promise<boolean> {
    const { dilemmaId } = await this.#roundDilemmaOf(player);
    const { reports } = await this.#gameStateOf(player);
    return !reports.some((report) => report.dilemmaId === dilemmaId);
  }

  async toldTheTeamWillReview(player: string): Promise<boolean> {
    return this.#toldOfReview.has(player);
  }

  async knowsAboutAReport(viewer: string): Promise<boolean> {
    const received = this.#notifier.receivedBy(this.#playerIdOf(viewer));
    const state = this.#gameId ? await this.#gameStateOf(viewer) : undefined;
    return (
      JSON.stringify(received).toLowerCase().includes('report') || (state?.reports.length ?? 0) > 0
    );
  }

  async reportNickname(player: string, other: string): Promise<void> {
    await this.#reportNickname.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(player),
      reportedPlayerId: this.#playerIdOf(other),
      reason: 'offensive',
    });
    this.#toldOfReview.add(player);
  }

  async syncModeration(): Promise<void> {
    await this.#moderation.sync();
  }

  async moderationIssues(): Promise<ModerationIssueView[]> {
    return this.#moderation.tracker.issues().map(({ title, body, comments, labels }) => ({
      title,
      body,
      comments,
      labels,
    }));
  }

  async storedReportComments(): Promise<string[]> {
    return this.#moderationIssues
      .all()
      .flatMap(({ dilemmaReports, nicknameReports }) => [...dilemmaReports, ...nicknameReports])
      .flatMap(({ comment }) => (comment === null ? [] : [comment]));
  }

  async teamDecides(
    issue: { readonly dilemmaId: string } | { readonly nickname: string } | 'the last one',
    decision: 'withdraw' | 'restore' | 'keep',
  ): Promise<void> {
    await this.#moderation.sync();
    const issues = this.#moderation.tracker.issues();
    const decided =
      issue === 'the last one'
        ? issues.at(-1)
        : issues.find(({ body }) =>
            'dilemmaId' in issue
              ? body.includes(`\`${issue.dilemmaId}\``)
              : body.includes(`> ${issue.nickname}`),
          );
    if (!decided) throw new Error('No issue of that content in the moderation repository');
    this.#moderation.tracker.decide(decided.number, { label: decision, comment: TEAM_REASONS });
    await this.#moderation.sync();
  }

  async aCatalogDilemma(): Promise<ReportedDilemma> {
    const dilemma = DILEMMAS.find(
      ({ minimumAge, compromising, language }) =>
        minimumAge === 16 && !compromising && (language ?? 'es') === 'es',
    );
    if (!dilemma) throw new Error('The test catalog has no dilemma for every room');
    return { dilemmaId: dilemma.dilemmaId, text: dilemma.text };
  }

  async reportedByDifferentPlayers(dilemmaId: string, count: number): Promise<void> {
    for (let reporter = 1; reporter <= count; reporter++) {
      await this.#moderation.receiveDilemmaReport.execute({
        dilemmaId,
        version: 1,
        reason: 'offensive',
        comment: null,
        language: 'es',
        identity: identityOf(`Reporter${reporter}`),
        reportedAt: this.#clock.now(),
      });
    }
  }

  async issuesMention(player: string): Promise<boolean> {
    const issues = JSON.stringify(this.#moderation.tracker.issues());
    return (
      issues.includes(identityOf(player)) ||
      issues.includes(`"${player}`) ||
      issues.includes(` ${player} `)
    );
  }

  async isPlayableInNewGames(dilemmaId: string): Promise<boolean> {
    return this.#catalog.statusOf(dilemmaId) === 'in-catalog';
  }

  async sendIllegalContentNotice(form: IllegalContentNoticeForm): Promise<void> {
    await this.#moderation.receiveIllegalContentNotice.execute({
      reference:
        form.dilemmaId === undefined
          ? 'Sala ABCDE, el apodo Pepe'
          : this.#moderationCatalog.linkTo(form.dilemmaId),
      explanation: 'Incita al odio contra un colectivo.',
      name: form.name ?? null,
      email: form.email ?? null,
      language: 'es',
      goodFaith: true,
      identity: identityOf('Notifier'),
    });
    this.#noticeAcknowledged = true;
  }

  async noticeAcknowledged(): Promise<boolean> {
    return this.#noticeAcknowledged;
  }

  async emailsTo(address: string): Promise<EmailView[]> {
    return this.#moderation.mailer
      .sent()
      .filter(({ to }) => to === address)
      .map(({ subject, text }) => ({ subject, text }));
  }

  async contactSeenInTheSettings(): Promise<never> {
    throw new Error('Only the device shows the settings: the scenario must be @screen');
  }

  async moderationNoticesOn(player: string): Promise<ModerationNoticeView[]> {
    const identity = identityOf(player);
    const notices = await this.#moderation.getNotices.execute(identity);
    for (const { id } of notices) {
      await this.#moderation.seeNotice.execute({ identity, noticeId: id });
    }
    return notices.map(({ subject, outcome, rule }) => ({
      about: subject.kind === 'report' ? 'report' : 'nickname',
      outcome,
      rule,
      // Every moderation notice says a person decided it and how to appeal.
      byAPerson: true,
      howToAppeal: true,
      facts: subject.kind === 'nickname' ? subject.facts.es : undefined,
    }));
  }

  async nicknameOfIn(viewer: string, player: string): Promise<string> {
    const { players } = await this.#roomStateOf(viewer);
    const seen = players.find(({ playerId }) => playerId === this.#playerIdOf(player));
    if (!seen) throw new Error(`${viewer} does not see ${player} in the room`);
    return seen.nickname;
  }

  #reportedDilemma(dilemmaId: string): ReportedDilemma {
    const dilemma = DILEMMAS.find((candidate) => candidate.dilemmaId === dilemmaId);
    if (!dilemma) throw new Error(`${dilemmaId} is not a dilemma of the tests`);
    return { dilemmaId, text: dilemma.text };
  }

  async skipReportedDilemma(player: string): Promise<void> {
    await this.#skipDilemma.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(player),
      dilemmaId: (await this.#roundDilemmaOf(player)).dilemmaId,
    });
  }

  async hostSeenBy(viewer: string): Promise<string> {
    return this.#nameOf((await this.#gameStateOf(viewer)).hostId);
  }

  async leave(player: string): Promise<void> {
    await this.#leaveRoom.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(player),
    });
    this.#playerCalled(player).connectionId = undefined;
  }

  /** The dilemma of the round in progress, as `player` gets it. */
  async #roundDilemmaOf(player: string) {
    const { dilemmas, round } = await this.#gameStateOf(player);
    const dilemma = dilemmas[round.position];
    if (!dilemma) throw new Error('The game has no dilemma for the round in progress');
    return dilemma;
  }

  #draftOf(player: string) {
    const draft = this.#drafts.get(player);
    if (!draft) throw new Error(`The scenario has ${player} predict before voting`);
    return draft;
  }

  /** The person in the gap predicts on a screen without a vote: their draft starts with the predictions. */
  async #draftOrPersonInTheGap(player: string) {
    const { dilemmaId } = await this.#roundDilemmaOf(player);
    const draft = this.#drafts.get(player);
    if (draft?.dilemmaId === dilemmaId || !(await this.aboutThemSeenBy(player))) {
      return this.#draftOf(player);
    }
    this.#drafts.set(player, { dilemmaId, vote: null, votePredictions: [] });
    return this.#draftOf(player);
  }

  async #currentGame() {
    const game = await this.#gameRepository.findById(this.#currentGameId());
    if (!game) throw new Error('The game of the room is not saved');
    return game;
  }

  /** The name the scenario gives the player with that id. */
  #nameOf(playerId: string): string {
    const found = [...this.#players].find(([, known]) => known.playerId === playerId);
    if (!found) throw new Error(`No player of the scenario has the id ${playerId}`);
    return found[0];
  }

  async #send(
    player: string,
    draft: {
      readonly dilemmaId: string;
      readonly vote: string | null;
      readonly votePredictions: readonly VotePrediction[];
      readonly distributionPrediction?: readonly PredictedShare[];
      readonly ready?: boolean;
    },
  ): Promise<void> {
    const playerId = this.#playerIdOf(player);
    await this.#answerDilemma.execute({
      roomId: this.#currentRoomId(),
      playerId,
      language: this.#languageOf(player),
      ...draft,
    });
    const { dilemmaId, vote } = draft;
    if (vote === null) return;
    this.#votes.set(player, [...(this.#votes.get(player) ?? []), { dilemmaId, vote }]);
  }

  async #start(host: string): Promise<void> {
    const { gameId } = await this.#startGame.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(host),
    });
    this.#gameId = gameId;
  }

  /** The option of the dilemma that `player` sees with that text, in any case, in their language. */
  async #optionSeenBy(player: string, dilemmaId: string, text: string): Promise<string> {
    const { dilemmas } = await this.#gameStateOf(player);
    const option = dilemmas
      .find((dilemma) => dilemma.dilemmaId === dilemmaId)
      ?.options.find((candidate) => candidate.text.toLowerCase() === text.toLowerCase());
    if (!option) throw new Error(`${player} sees no option "${text}" in dilemma ${dilemmaId}`);
    return option.optionId;
  }

  async #changeRounds(player: string, rounds: readonly RoundChange[]): Promise<void> {
    await this.#changeRoomSettings.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(player),
      changes: { rounds },
    });
  }

  /** The scenario counts rounds from 1, as people do. */
  #roundAt(rounds: readonly LobbyRound[], round: number): LobbyRound {
    const found = rounds[round - 1];
    if (!found) throw new Error(`The room has no round ${round}`);
    return found;
  }

  async #expel(host: string, player: string): Promise<void> {
    await this.#expelPlayer.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(host),
      expelledPlayerId: this.#playerIdOf(player),
    });
  }

  async #codeLeadsToTheRoom(player: string): Promise<boolean> {
    const code = await this.#codeSeenBy(player);
    const roomId = this.#currentRoomId();
    if (code.length !== 5) return false;
    // Whoever follows the link or scans the QR: someone who is not in the room yet.
    const preview = await this.#getRoomPreview.execute({
      code,
      identity: identityOf('someone else'),
    });
    return preview.roomId === roomId;
  }

  /** Whether the application accepts the command; only the refusals given are what the scenario looks for. */
  async #accepts(
    command: () => Promise<unknown>,
    ...refusals: readonly (abstract new (...args: never[]) => Error)[]
  ): Promise<boolean> {
    try {
      await command();
      return true;
    } catch (error) {
      if (refusals.some((refusal) => error instanceof refusal)) return false;
      throw error;
    }
  }

  /**
   * The state of the room on the device of `player`: a device gets it on entering the room and
   * fetches it again each time it is told the lobby changed, and only then.
   */
  async #screenOf(player: string): Promise<GetRoomStateOutput> {
    const device = this.#playerCalled(player);
    const notices = this.#notifier
      .receivedBy(this.#playerIdOf(player))
      .filter((event) => event instanceof LobbyChangedEvent).length;
    if (!device.screen || notices > device.screen.notices) {
      device.screen = { state: await this.#roomStateOf(player), notices };
    }
    return device.screen.state;
  }

  /** The code of the room as `player` gets it: in the state of the game in progress, or of the lobby. */
  async #codeSeenBy(player: string): Promise<string> {
    const { code, currentGameId } = await this.#roomStateOf(player);
    if (!currentGameId) return code;
    const game = await this.#getGameState.execute({
      gameId: currentGameId,
      playerId: this.#playerIdOf(player),
      language: this.#languageOf(player),
    });
    return game.code;
  }

  async #roomStateOf(player: string): Promise<GetRoomStateOutput> {
    return this.#getRoomState.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(player),
      language: this.#languageOf(player),
    });
  }

  async #gameStateOf(player: string) {
    return this.#getGameState.execute({
      gameId: this.#currentGameId(),
      playerId: this.#playerIdOf(player),
      language: this.#languageOf(player),
    });
  }

  #languageOf(player: string): string {
    return this.#languages.get(player) ?? DEFAULT_CHOICES.deviceLanguage;
  }

  /** The scenario counts dilemmas from 1, as people do. */
  async #dilemmaIdAt(position: number): Promise<string> {
    const dilemmaId = (await this.dilemmasOfTheGame())[position - 1];
    if (!dilemmaId) throw new Error(`The game has no dilemma in position ${position}`);
    return dilemmaId;
  }

  #introduce(player: string): AcceptancePlayer {
    const known = this.#players.get(player);
    if (known) return known;
    const introduced: AcceptancePlayer = {
      identity: identityOf(player),
      playerId: undefined,
      typedCode: undefined,
      roomId: undefined,
      preview: undefined,
      previewPlayers: [],
      avatar: undefined,
      askedForAnotherAvatar: false,
      refusal: undefined,
      connectionId: undefined,
      screen: undefined,
      played: [],
    };
    this.#players.set(player, introduced);
    return introduced;
  }

  #avatarOnScreen(player: string): Avatar {
    const { avatar } = this.#playerCalled(player);
    if (!avatar) throw new Error(`${player} is on no screen that shows an avatar`);
    return avatar;
  }

  #hostName(): string {
    if (!this.#host) throw new Error('The scenario uses the room before anyone creates it');
    return this.#host;
  }

  #currentRoomId(): string {
    if (!this.#roomId) throw new Error('The scenario uses the room before anyone creates it');
    return this.#roomId;
  }

  #currentGameId(): string {
    if (!this.#gameId) throw new Error('The scenario uses the game before the decision phase');
    return this.#gameId;
  }

  #playerCalled(player: string): AcceptancePlayer {
    const known = this.#players.get(player);
    if (!known) throw new Error(`No player called "${player}" in this scenario`);
    return known;
  }

  /** A player the scenario never brought into the room is a mistake in the scenario, not in the game. */
  #playerIdOf(player: string): string {
    const { playerId } = this.#playerCalled(player);
    if (!playerId) throw new Error(`"${player}" is not in the room in this scenario`);
    return playerId;
  }

  // Sound and motion happen only on the device: their scenarios are @screen.

  async resultsScreenShownTo(): Promise<number> {
    throw new Error('Only the device looks back at the results: the scenario must be @screen');
  }

  async goBackInTheResults(): Promise<void> {
    throw new Error('Only the device looks back at the results: the scenario must be @screen');
  }

  async goForwardInTheResults(): Promise<void> {
    throw new Error('Only the device looks back at the results: the scenario must be @screen');
  }

  async soundsHeardBy(): Promise<string[]> {
    throw new Error('Only the device plays sounds: the scenario must be @screen');
  }

  async vibrationsOf(): Promise<number> {
    throw new Error('Only the device vibrates: the scenario must be @screen');
  }

  async canSound(): Promise<boolean> {
    throw new Error('Only the device plays sounds: the scenario must be @screen');
  }

  async mute(): Promise<void> {
    throw new Error('Only the device can be muted: the scenario must be @screen');
  }

  async isMuted(): Promise<boolean> {
    throw new Error('Only the device can be muted: the scenario must be @screen');
  }

  async reopenApp(): Promise<void> {
    throw new Error('Only a device opens the app again: the scenario must be @screen');
  }

  reduceMotionFor(): void {
    throw new Error('Only a device reduces motion: the scenario must be @screen');
  }

  async movementsSeenBy(): Promise<string[]> {
    throw new Error('Only the device moves things: the scenario must be @screen');
  }

  async reachLastSeconds(): Promise<void> {
    throw new Error('Only the device counts the last seconds: the scenario must be @screen');
  }
}
