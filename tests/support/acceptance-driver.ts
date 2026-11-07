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
  GetGameStateUseCase,
  GetRoomPreviewUseCase,
  GetRoomStateUseCase,
  JoinRoomUseCase,
  LobbyChangedEvent,
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
  InMemoryGameRepository,
  InMemoryPlayerNotifier,
  InMemoryRoomRepository,
  InMemorySealProvider,
  SequentialIdGenerator,
  SequentialRandomness,
  type InMemoryDilemma,
} from '@thelever-app/game/in-memory';
import type {
  CatalogEntry,
  GameDriver,
  GameSettingsView,
  InvitationMethod,
  JoinRefusal,
  PlayerView,
  RoomChoices,
  RoomPreview,
  SettingsView,
} from './driver.ts';
import {
  catalogEntryOf,
  EXPLORATION_SLOTS,
  explorationSlotsFor,
  OPTION_TEXTS,
  TEST_DILEMMAS,
} from './test-catalog.ts';

/** Test data: the vote the driver casts when a step does not say which one. */
const VOTE = 'option-1';
/** Test data: the vote the driver changes to; the other option of every dilemma. */
const OTHER_VOTE = 'option-2';

/** Test data: what the creation screen gets when a step does not choose. */
const DEFAULT_CHOICES = { groupNature: 'friends', place: 'together', deviceLanguage: 'es' };

/** The test data, as the catalog of Game keeps it: every dilemma with the same two options. */
const DILEMMAS: readonly InMemoryDilemma[] = TEST_DILEMMAS.map(
  ({ dilemmaId, text, minimumAge, category, tags, status }) => ({
    dilemmaId,
    text,
    options: [
      { optionId: VOTE, text: OPTION_TEXTS[0] },
      { optionId: OTHER_VOTE, text: OPTION_TEXTS[1] },
    ],
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

function avatarText({ face, color }: { readonly face: string; readonly color: string }): string {
  return `${face}/${color}`;
}

/** One player of the scenario, as the driver knows them. */
interface AcceptancePlayer {
  readonly identity: string;
  playerId: string | undefined;
  /** The room this player opened and has not entered yet, or entered. */
  roomId: string | undefined;
  preview: RoomPreview | undefined;
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

    this.#createRoom = new CreateRoomUseCase(rooms, idGenerator, randomness);
    this.#getRoomPreview = new GetRoomPreviewUseCase(rooms);
    this.#joinRoom = new JoinRoomUseCase(rooms, notifier, idGenerator, randomness);
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
      },
      EXPLORATION_SLOTS,
    );
    this.#answerDilemma = new AnswerDilemmaUseCase(
      rooms,
      this.#gameRepository,
      notifier,
      new InMemorySealProvider(),
    );
    this.#getGameState = new GetGameStateUseCase(rooms, this.#gameRepository, catalog);
    this.#connectPlayer = new ConnectPlayerUseCase(rooms, notifier, idGenerator);
    this.#disconnectPlayer = new DisconnectPlayerUseCase(rooms, notifier);
  }

  async start(): Promise<void> {
    // Nothing to prepare: the constructor already built a fresh set of adapters for this scenario.
  }

  async stop(): Promise<void> {
    // Nothing to release: everything lives in memory.
  }

  // Lobby

  async createRoom(host: string, choices: RoomChoices = {}): Promise<void> {
    const { groupNature, place, deviceLanguage } = { ...DEFAULT_CHOICES, ...choices };
    const player = this.#introduce(host);
    const { roomId, hostId } = await this.#createRoom.execute({
      hostNickname: host,
      hostIdentity: player.identity,
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
    return (await this.#roomStateOf(player)).code;
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
  }

  async typeRoomCode(player: string, code: string): Promise<void> {
    const opener = this.#introduce(player);
    try {
      const preview = await this.#getRoomPreview.execute({ code });
      opener.roomId = preview.roomId;
      opener.preview = {
        host: preview.hostNickname,
        variant: preview.variant,
        adultsOnly: preview.adultsOnly,
        playerCount: preview.playerCount,
      };
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

  async confirmNickname(player: string, nickname: string): Promise<void> {
    const joiner = this.#playerCalled(player);
    if (!joiner.roomId) throw new Error(`The scenario has ${player} enter without opening a room`);
    try {
      const { playerId } = await this.#joinRoom.execute({
        roomId: joiner.roomId,
        nickname,
        identity: joiner.identity,
      });
      joiner.playerId = playerId;
      joiner.refusal = undefined;
      await this.#screenOf(player);
    } catch (error) {
      if (error instanceof RoomFullError) joiner.refusal = 'room-full';
      else if (error instanceof PlayerExpelledError) joiner.refusal = 'expelled';
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

  async chooseAnotherFreeAvatar(player: string): Promise<string> {
    const { players } = await this.#roomStateOf(player);
    const taken = new Set(players.map(({ avatar }) => avatarText(avatar)));
    const free = AvatarVO.all().find((avatar) => !taken.has(avatarText(avatar)));
    if (!free) throw new Error('The room has no free avatar left');

    await this.#changeAvatar.execute({
      roomId: this.#currentRoomId(),
      playerId: this.#playerIdOf(player),
      face: free.face,
      color: free.color,
    });
    return avatarText(free);
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

  // Decision phase

  async startDecisionPhase(): Promise<void> {
    await this.startGame(this.#hostName());

    // Every player has the game open, as their device would after the phase starts.
    for (const player of this.#players.keys()) {
      if (this.#players.get(player)?.playerId) await this.reconnect(player);
    }
  }

  /** Answers the first `count` dilemmas of the game, in order. */
  async answerDilemmas(player: string, count: number): Promise<void> {
    for (const dilemmaId of (await this.dilemmasOfTheGame()).slice(0, count)) {
      await this.#answer(player, dilemmaId, VOTE);
    }
  }

  async changeVote(player: string, position: number): Promise<void> {
    const [previous] = (await this.votesCastFor(player, position)).slice(-1);
    if (!previous) throw new Error(`The scenario changes a vote ${player} never cast`);
    const dilemmaId = await this.#dilemmaIdAt(position);
    await this.#answer(player, dilemmaId, previous === VOTE ? OTHER_VOTE : VOTE);
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

  async votesRecordedFor(player: string): Promise<string[]> {
    const { answers } = await this.#gameStateOf(player);
    return answers.map(({ vote }) => vote);
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
    const { dilemmas: played, answers } = await this.#gameStateOf(player);
    const answered = new Set(answers.map(({ dilemmaId }) => dilemmaId));
    return played.findIndex(({ dilemmaId }) => !answered.has(dilemmaId)) + 1;
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

  /** What `viewer` knows about the progress of `player`: the last update they received. */
  async progressSeenBy(viewer: string, player: string): Promise<number | undefined> {
    const playerId = this.#playerIdOf(player);
    const updates = this.#notifier
      .receivedBy(this.#playerIdOf(viewer))
      .filter((event) => event instanceof ProgressUpdatedEvent)
      .filter((event) => event.playerId === playerId);
    return updates.at(-1)?.progress;
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

  async #answer(player: string, dilemmaId: string, vote: string): Promise<void> {
    const playerId = this.#playerIdOf(player);
    await this.#answerDilemma.execute({ roomId: this.#currentRoomId(), playerId, dilemmaId, vote });
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
    const { code, roomId } = await this.#roomStateOf(player);
    if (code.length !== 5) return false;
    return (await this.#getRoomPreview.execute({ code })).roomId === roomId;
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
      roomId: undefined,
      preview: undefined,
      refusal: undefined,
      connectionId: undefined,
      screen: undefined,
    };
    this.#players.set(player, introduced);
    return introduced;
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
}
