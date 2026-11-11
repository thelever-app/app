import {
  AddDilemmaUseCase,
  AnswerDilemmaUseCase,
  ChangeAvatarUseCase,
  ChangeRoomSettingsUseCase,
  ConnectionChangedEvent,
  ConnectPlayerUseCase,
  CreateRoomUseCase,
  DisconnectPlayerUseCase,
  ExpelPlayerUseCase,
  GAP_MARKER,
  LeaveRoomUseCase,
  ReportDilemmaUseCase,
  MoveOnUseCase,
  RevealEarlyUseCase,
  RunOutRoundUseCase,
  SkipDilemmaUseCase,
  DecisionPhaseOverError,
  DilemmaSkippedError,
  VoteMissingError,
  type Seal,
  type VotePrediction,
  GetGameStateUseCase,
  GetRoomPreviewUseCase,
  GetRoomStateUseCase,
  JoinRoomUseCase,
  LobbyChangedEvent,
  NicknameAndAvatarTakenError,
  PickDilemmasUseCase,
  GameInProgressError,
  NotEnoughPlayersError,
  NotHostError,
  PlayerExpelledError,
  ProgressUpdatedEvent,
  RemoveAddedDilemmaUseCase,
  RoomCodeNotFoundError,
  RoomFullError,
  SearchDilemmasUseCase,
  StartGameUseCase,
  AvatarVO,
  type GetRoomStateOutput,
  TooManyAddedDilemmasError,
} from '@thelever-app/game';
import {
  InMemoryDilemmaCatalog,
  InMemoryDilemmaReports,
  InMemoryGameRepository,
  ManualClock,
  InMemoryPlayerNotifier,
  InMemoryRoomRepository,
  InMemorySealProvider,
  SequentialIdGenerator,
  SequentialRandomness,
  type InMemoryDilemma,
} from '@thelever-app/game/in-memory';
import type {
  AnswerPlan,
  CatalogEntry,
  Declaration,
  GameDriver,
  GameSettingsView,
  InvitationMethod,
  JoinRefusal,
  PlayerView,
  RecordedAnswer,
  ReportReason,
  RevealView,
  RoomChoices,
  RoomPreview,
  SettingsView,
} from './driver.ts';
import {
  catalogEntryOf,
  EXPLORATION_SLOTS,
  explorationSlotsFor,
  TEST_DILEMMAS,
  TWO_OPTION_DILEMMA_IDS,
} from './test-catalog.ts';

/** Test data: the vote the driver casts when a step does not say which one; the first option. */
const VOTE = 'option-1';
/** Test data: the vote the driver changes to; the second option of every dilemma. */
const OTHER_VOTE = 'option-2';

/** Test data: what the creation screen gets when a step does not choose. */
const DEFAULT_CHOICES = { groupNature: 'friends', place: 'together', deviceLanguage: 'es' };

/** The test data, as the catalog of Game keeps it: every dilemma with the same two options. */
const DILEMMAS: readonly InMemoryDilemma[] = TEST_DILEMMAS.map(
  ({ dilemmaId, text, minimumAge, category, tags, status, options }) => ({
    dilemmaId,
    text,
    options: options.map((option, index) => ({ optionId: `option-${index + 1}`, text: option })),
    minimumAge: minimumAge as 16 | 18,
    category,
    tags,
    status,
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

/** One player of the scenario, as the driver knows them. */
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
export class AcceptanceDriver implements GameDriver {
  readonly #catalog = new InMemoryDilemmaCatalog(DILEMMAS);
  readonly #roomRepository = new InMemoryRoomRepository();
  readonly #gameRepository = new InMemoryGameRepository();
  /** Kept with its concrete type to read what each player received. */
  readonly #notifier = new InMemoryPlayerNotifier();
  readonly #clock = new ManualClock();
  /** What each identity declared and consented to, which the seal provider hands out. */
  readonly #seals = new Map<string, Seal>();
  readonly #reports = new InMemoryDilemmaReports();

  readonly #createRoom: CreateRoomUseCase;
  readonly #getRoomPreview: GetRoomPreviewUseCase;
  readonly #joinRoom: JoinRoomUseCase;
  readonly #getRoomState: GetRoomStateUseCase;
  readonly #changeAvatar: ChangeAvatarUseCase;
  readonly #changeRoomSettings: ChangeRoomSettingsUseCase;
  readonly #addDilemma: AddDilemmaUseCase;
  readonly #removeAddedDilemma: RemoveAddedDilemmaUseCase;
  readonly #searchDilemmas: SearchDilemmasUseCase;
  readonly #pickDilemmas: PickDilemmasUseCase;
  readonly #expelPlayer: ExpelPlayerUseCase;
  readonly #startGame: StartGameUseCase;
  readonly #answerDilemma: AnswerDilemmaUseCase;
  readonly #getGameState: GetGameStateUseCase;
  readonly #connectPlayer: ConnectPlayerUseCase;
  readonly #disconnectPlayer: DisconnectPlayerUseCase;
  readonly #revealEarly: RevealEarlyUseCase;
  readonly #runOutRound: RunOutRoundUseCase;
  readonly #moveOn: MoveOnUseCase;
  readonly #leaveRoom: LeaveRoomUseCase;
  readonly #reportDilemma: ReportDilemmaUseCase;
  readonly #skipDilemma: SkipDilemmaUseCase;
  /** What each player is answering of the dilemma they are on, as the screen holds it. */
  readonly #drafts = new Map<
    string,
    {
      readonly dilemmaId: string;
      vote: string;
      votePredictions: VotePrediction[];
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

    this.#createRoom = new CreateRoomUseCase(rooms, idGenerator, randomness);
    this.#getRoomPreview = new GetRoomPreviewUseCase(rooms, randomness);
    this.#joinRoom = new JoinRoomUseCase({
      roomRepository: rooms,
      gameRepository: games,
      notifier,
      idGenerator,
      randomness,
    });
    this.#getRoomState = new GetRoomStateUseCase(rooms, catalog);
    this.#changeAvatar = new ChangeAvatarUseCase(rooms, notifier);
    this.#changeRoomSettings = new ChangeRoomSettingsUseCase(rooms, notifier);
    this.#addDilemma = new AddDilemmaUseCase(rooms, catalog, notifier);
    this.#removeAddedDilemma = new RemoveAddedDilemmaUseCase(rooms, notifier);
    this.#searchDilemmas = new SearchDilemmasUseCase(rooms, catalog);
    this.#pickDilemmas = new PickDilemmasUseCase(rooms, catalog, notifier);
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
    );
    this.#answerDilemma = new AnswerDilemmaUseCase({
      roomRepository: rooms,
      gameRepository: games,
      notifier,
      sealProvider: new InMemorySealProvider(this.#seals),
      clock,
    });
    this.#getGameState = new GetGameStateUseCase(rooms, this.#gameRepository, catalog);
    this.#connectPlayer = new ConnectPlayerUseCase(rooms, games, notifier, idGenerator);
    this.#disconnectPlayer = new DisconnectPlayerUseCase(rooms, games, notifier, clock);
    this.#revealEarly = new RevealEarlyUseCase(rooms, games, notifier, clock);
    this.#runOutRound = new RunOutRoundUseCase(rooms, games, notifier, clock);
    this.#moveOn = new MoveOnUseCase(rooms, games, notifier, clock);
    this.#leaveRoom = new LeaveRoomUseCase(rooms, games, notifier, clock);
    this.#skipDilemma = new SkipDilemmaUseCase({
      roomRepository: rooms,
      gameRepository: games,
      notifier,
      clock,
    });
    this.#reportDilemma = new ReportDilemmaUseCase({
      roomRepository: rooms,
      gameRepository: games,
      reports: this.#reports,
      notifier,
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

  async createRoom(host: string, choices: RoomChoices = {}): Promise<void> {
    const { groupNature, place, deviceLanguage } = { ...DEFAULT_CHOICES, ...choices };
    await this.openRoomCreation(host);
    const player = this.#playerCalled(host);
    const { roomId, hostId } = await this.#createRoom.execute({
      hostNickname: host,
      hostIdentity: player.identity,
      hostAvatar: this.#avatarOnScreen(host),
      groupNature,
      place,
      dilemmaLanguage: deviceLanguage,
    });
    this.#roomId = roomId;
    this.#host = host;
    player.playerId = hostId;
    player.roomId = roomId;
    await this.#screenOf(host);
  }

  /** The application takes both in the single command that creates the room. */
  async nicknameAndGroupNatureAskedTogether(host: string): Promise<boolean> {
    const state = await this.#roomStateOf(host);
    const nickname = state.players.find(({ playerId }) => playerId === state.playerId)?.nickname;
    return nickname === host && state.groupNature !== undefined;
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
        variant: preview.variant,
        adultsOnly: preview.adultsOnly,
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
      });
      joiner.playerId = playerId;
      joiner.refusal = undefined;
      joiner.askedForAnotherAvatar = false;
      await this.#screenOf(player);
      // Who joins a game in progress has it open at once, as their device would.
      if (joinedLate) await this.reconnect(player);
    } catch (error) {
      if (error instanceof RoomFullError) joiner.refusal = 'room-full';
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

  async addDilemma(player: string): Promise<void> {
    await this.#add(player, await this.#notYetAdded(player));
  }

  async tryToAddAnotherDilemma(player: string): Promise<boolean> {
    const another = await this.#notYetAdded(player);
    return this.#accepts(() => this.#add(player, another), TooManyAddedDilemmasError);
  }

  async addedDilemmasSeenBy(viewer: string): Promise<string[]> {
    const { addedDilemmas } = await this.#roomStateOf(viewer);
    return addedDilemmas.map(({ dilemmaId }) => dilemmaId);
  }

  async authorsOfAddedDilemmasSeenBy(viewer: string): Promise<string[]> {
    const { addedDilemmas, players } = await this.#roomStateOf(viewer);
    const seen = JSON.stringify(addedDilemmas);
    return players
      .filter(({ playerId, nickname }) => seen.includes(playerId) || seen.includes(nickname))
      .map(({ nickname }) => nickname);
  }

  /** What the screen offers to remove: every added dilemma to the host, their own to the rest. */
  async removeAddedDilemma(player: string): Promise<void> {
    const state = await this.#roomStateOf(player);
    const removable =
      state.hostId === state.playerId
        ? state.addedDilemmas.map(({ dilemmaId }) => dilemmaId)
        : state.ownAddedDilemmaIds;
    const [dilemmaId] = removable;
    if (!dilemmaId) {
      throw new Error(`The scenario has ${player} remove a dilemma, but none is theirs`);
    }
    await this.#removeAddedDilemma.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(player),
      dilemmaId,
    });
  }

  async searchDilemmas(player: string, text?: string): Promise<string[]> {
    const found = await this.#searchDilemmas.execute({
      roomId: this.#currentRoomId(),
      identity: this.#playerCalled(player).identity,
      ...(text && { text }),
    });
    return found.map(({ dilemmaId }) => dilemmaId);
  }

  async pickDilemmas(host: string, dilemmaIds: string[]): Promise<void> {
    await this.#pickDilemmas.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(host),
      dilemmaIds,
    });
  }

  /** Picking none is how the screen goes back to a game by categories. */
  async playByCategories(host: string): Promise<void> {
    await this.pickDilemmas(host, []);
  }

  async pickedDilemmasSeenBy(viewer: string): Promise<string[]> {
    const { pickedDilemmas } = await this.#roomStateOf(viewer);
    return pickedDilemmas.map(({ dilemmaId }) => dilemmaId);
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
  async settingsOfTheGame(): Promise<GameSettingsView> {
    const game = await this.#gameRepository.findById(this.#currentGameId());
    if (!game) throw new Error('The game of the room is not saved');
    return game.settings;
  }

  newDilemmasSetForGamesOf(dilemmaCount: number): number {
    return explorationSlotsFor(dilemmaCount);
  }

  // Rounds

  async startDecisionPhase(dilemmaCount?: number): Promise<void> {
    const host = this.#hostName();
    const { pickedDilemmas, addedDilemmas } = await this.#roomStateOf(host);
    if (dilemmaCount !== undefined && pickedDilemmas.length === 0 && addedDilemmas.length === 0) {
      await this.pickDilemmas(host, TWO_OPTION_DILEMMA_IDS.slice(0, dilemmaCount));
    }
    await this.startGame(host);

    // Every player has the game open, as their device would after the game starts.
    for (const player of this.#players.keys()) {
      if (this.#players.get(player)?.playerId) await this.reconnect(player);
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

  async answer(player: string, plan: AnswerPlan = {}): Promise<void> {
    const dilemma = await this.#roundDilemmaOf(player);
    const { playersToPredict } = await this.#gameStateOf(player);
    const draft = {
      dilemmaId: dilemma.dilemmaId,
      vote: plan.vote ? optionIdOf(dilemma.dilemmaId, plan.vote) : VOTE,
      votePredictions:
        plan.votePredictions === false
          ? []
          : playersToPredict.map((playerId) => ({ playerId, vote: VOTE })),
    };
    this.#drafts.set(player, draft);
    await this.#send(player, draft);
  }

  async vote(player: string, option?: string): Promise<void> {
    const { dilemmaId } = await this.#roundDilemmaOf(player);
    const draft = {
      dilemmaId,
      vote: option ? optionIdOf(dilemmaId, option) : VOTE,
      votePredictions: [],
    };
    this.#drafts.set(player, draft);
    await this.#send(player, draft);
  }

  /** The screen keeps the predictions made and sends them again with the new vote. */
  async changeVote(player: string, option?: string): Promise<void> {
    const { dilemmaId } = await this.#roundDilemmaOf(player);
    const { answers } = await this.#gameStateOf(player);
    const previous = answers.find((answer) => answer.dilemmaId === dilemmaId);
    if (!previous) throw new Error(`The scenario changes a vote ${player} never cast`);
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

  async voteRecordedFor(player: string, position: number): Promise<string | undefined> {
    const { answers } = await this.#gameStateOf(player);
    const dilemmaId = await this.#dilemmaIdAt(position);
    return answers.find((answer) => answer.dilemmaId === dilemmaId)?.vote;
  }

  /** Whether the application takes an answer of the player for the dilemma of the round. */
  async canAnswer(player: string): Promise<boolean> {
    const { dilemmaId } = await this.#roundDilemmaOf(player);
    return this.#accepts(
      () =>
        this.#answerDilemma.execute({
          roomId: this.#currentRoomId(),
          playerId: this.#playerIdOf(player),
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

  async positionAddedBy(player: string): Promise<number> {
    const playerId = this.#playerIdOf(player);
    const index = (await this.#currentGame()).dilemmas.findIndex(
      ({ addedBy }) => addedBy === playerId,
    );
    if (index === -1) throw new Error(`${player} added no dilemma of the game`);
    return index + 1;
  }

  /** The game keeps the id of the dilemma; its text stays in Dilemmas, as it was written. */
  async textKeptFor(position: number): Promise<string> {
    const game = await this.#currentGame();
    const played = game.dilemmas[position - 1];
    if (!played) throw new Error(`The game has no dilemma in position ${position}`);
    const [content] = await this.#catalog.findContents([played]);
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
      vote: optionTextOf(dilemmaId, answer.vote),
      votePredictions: answer.votePredictions.map((prediction) => ({
        player: this.#nameOf(prediction.playerId),
        vote: optionTextOf(dilemmaId, prediction.vote),
      })),
      optionOrder: answer.optionOrder.map((optionId) => optionTextOf(dilemmaId, optionId)),
      responseTimeSeconds: answer.responseTimeMs === null ? null : answer.responseTimeMs / 1000,
      voterInTheGap: answer.voterInTheGap,
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
      gameConsentVersion: '1',
      researchConsentVersion: researchConsent ? '1' : null,
      commercialLicenceConsentVersion: null,
      underEighteen,
    });
  }

  async letTimePass(seconds: number): Promise<void> {
    this.#clock.advance(seconds * 1000);
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
    const { reveal } = await this.#gameStateOf(viewer);
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
      addedBy: reveal.addedBy && this.#nameOf(reveal.addedBy),
      showsPoints: /points/i.test(JSON.stringify(reveal)),
    };
  }

  async moveOn(player: string): Promise<void> {
    const { round } = await this.#gameStateOf(player);
    await this.#moveOn.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(player),
      fromPosition: round.position,
    });
  }

  /** Both tap at once, from the round each of them sees. */
  async moveOnTogether(players: readonly string[]): Promise<void> {
    const moves = await Promise.all(
      players.map(async (player) => ({
        playerId: this.#playerIdOf(player),
        fromPosition: (await this.#gameStateOf(player)).round.position,
      })),
    );
    await Promise.all(
      moves.map((move) => this.#moveOn.execute({ roomId: this.#currentRoomId(), ...move })),
    );
  }

  async movedOnSeenBy(viewer: string): Promise<string | null> {
    const { movedOnBy } = (await this.#gameStateOf(viewer)).round;
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
    const draft = this.#draftOf(player);
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

  async report(player: string, reason: ReportReason): Promise<void> {
    await this.#reportDilemma.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(player),
      dilemmaId: (await this.#roundDilemmaOf(player)).dilemmaId,
      reason,
    });
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
      readonly vote: string;
      readonly votePredictions: readonly VotePrediction[];
    },
  ): Promise<void> {
    const playerId = this.#playerIdOf(player);
    await this.#answerDilemma.execute({ roomId: this.#currentRoomId(), playerId, ...draft });
    const { dilemmaId, vote } = draft;
    this.#votes.set(player, [...(this.#votes.get(player) ?? []), { dilemmaId, vote }]);
  }

  async #start(host: string): Promise<void> {
    const { gameId } = await this.#startGame.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(host),
    });
    this.#gameId = gameId;
  }

  /** A dilemma of the catalog suitable for the room that nobody added yet. */
  async #notYetAdded(player: string): Promise<string> {
    const added = new Set(await this.addedDilemmasSeenBy(player));
    const dilemmaId = (await this.searchDilemmas(player)).find((id) => !added.has(id));
    if (!dilemmaId) throw new Error('The catalog has no other dilemma suitable for the room');
    return dilemmaId;
  }

  async #add(player: string, dilemmaId: string): Promise<void> {
    await this.#addDilemma.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(player),
      dilemmaId,
    });
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
      language: 'en',
    });
    return game.code;
  }

  async #roomStateOf(player: string): Promise<GetRoomStateOutput> {
    return this.#getRoomState.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(player),
    });
  }

  async #gameStateOf(player: string) {
    return this.#getGameState.execute({
      gameId: this.#currentGameId(),
      playerId: this.#playerIdOf(player),
      language: 'en',
    });
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
