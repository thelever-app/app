/** What the host chooses on the screen to create a room; the driver picks test data for the rest. */
export interface RoomChoices {
  readonly groupNature?: string;
  readonly place?: string;
  /** The language of the device, which the room takes for its dilemmas. */
  readonly deviceLanguage?: string;
}

/** The configuration of the room, as a player of the lobby sees it. */
export interface SettingsView {
  readonly variant: string;
  readonly adultsOnly: boolean;
  readonly dilemmaLanguage: string;
  /** Null, every category; an empty list, none. */
  readonly categories: readonly string[] | null;
  readonly dilemmaCount: number;
  readonly totalTimeInMinutes: number;
  readonly newDilemmas: boolean;
  readonly dilemmasPerPlayer: number;
}

/** What a player sees of a room before entering it. */
export interface RoomPreview {
  readonly host: string;
  readonly variant: string;
  readonly adultsOnly: boolean;
  readonly playerCount: number;
}

/** A player of the room as another one sees them in the lobby. */
export interface PlayerView {
  readonly nickname: string;
  /** Face and colour, as one text: two players with the same one would look the same. */
  readonly avatar: string;
}

/** What the game copied from the room when it started. */
export interface GameSettingsView {
  readonly variant: string;
  readonly place: string;
  readonly dilemmaLanguage: string;
  readonly totalTimeInMinutes: number;
}

/** Test data the driver loaded: what a dilemma is, to check what a game or a search returns. */
export interface CatalogEntry {
  readonly text: string;
  readonly minimumAge: number;
  readonly category: string;
  readonly status: 'in-catalog' | 'in-exploration';
}

/** What the game keeps of the answer of a player to a dilemma. */
export interface RecordedAnswer {
  /** The text of the option voted, as the test data writes it. */
  readonly vote: string;
  readonly matchPrediction: number | null;
  /** By the name the scenario gives each predicted player, with the text of the option. */
  readonly votePredictions: readonly { readonly player: string; readonly vote: string }[];
  /** The texts of the options in the order the voter saw them. */
  readonly optionOrder: readonly string[];
  readonly responseTimeSeconds: number | null;
  readonly voterInTheGap: boolean;
  readonly researchConsent: boolean;
  readonly commercialLicenceConsent: boolean;
  readonly underEighteen: boolean;
}

/** What a player declared and consented to, which the seal of their answers records. */
export interface Declaration {
  readonly underEighteen: boolean;
  readonly researchConsent: boolean;
}

/** Why a player reports a dilemma, as the scenario says it. */
export type ReportReason = 'offensive' | 'confusing';

export type InvitationMethod = 'invitation link' | 'code' | 'QR';

/** Why a player could not get into a room. */
export type JoinRefusal = 'room-does-not-exist' | 'room-full' | 'expelled';

/**
 * What a scenario can do and observe, in the words of the ubiquitous language.
 * Step definitions only talk to this interface; each profile plugs in its own implementation.
 *
 * Players are named by the scenario. A nickname that two players share is told apart by the name
 * the scenario gives each of them (`player`) and the nickname they confirm (`nickname`).
 */
export interface GameDriver {
  /** Prepares whatever the driver needs before a scenario. */
  start(): Promise<void>;
  /** Releases everything the driver opened during the scenario. */
  stop(): Promise<void>;

  // Lobby

  /** `host` creates a room from the home screen, with a nickname, the nature of the group and the place. */
  createRoom(host: string, choices?: RoomChoices): Promise<void>;
  /** Whether `host` gave their nickname and the nature of the group on the same screen. */
  nicknameAndGroupNatureAskedTogether(host: string): Promise<boolean>;
  isHost(player: string): Promise<boolean>;
  /** The code of the room, as `player` sees it in the lobby. */
  roomCodeSeenBy(player: string): Promise<string>;
  /** Whether the invitation link `player` can share takes whoever opens it to the room. */
  canShareInvitationLink(player: string): Promise<boolean>;
  /** Whether `player` can show full screen a QR that takes whoever scans it to the room. */
  canShowQrFullScreen(player: string): Promise<boolean>;
  /** Whether `player` sees the advice to play on a video call. */
  videoCallAdviceSeenBy(player: string): Promise<boolean>;
  /** Where the game is recorded as played, together or remote. */
  placeRecorded(): Promise<string>;

  /** The device of `player` last played with that nickname. Only on the device (@screen). */
  lastPlayedAs(player: string, nickname: string): Promise<void>;
  /** What the nickname field shows to `player` before they enter. Only on the device (@screen). */
  nicknameFieldSeenBy(player: string): Promise<string>;
  /** `player` opens the room with one of the ways of inviting and sees it before entering. */
  openInvitation(player: string, method: InvitationMethod): Promise<void>;
  /** `player` types a code on the join screen, without pressing any button. */
  typeRoomCode(player: string, code: string): Promise<void>;
  roomPreviewSeenBy(player: string): Promise<RoomPreview | undefined>;
  /** `player` confirms a nickname for the room they opened, and tries to enter. */
  confirmNickname(player: string, nickname: string): Promise<void>;
  /** `player` opens the room by its code and enters with a nickname, their name unless given. */
  joinRoom(player: string, nickname?: string): Promise<void>;
  /** As `joinRoom`, but the player may be turned away: see `joinRefusalSeenBy`. */
  tryToJoinRoom(player: string): Promise<void>;
  joinRefusalSeenBy(player: string): Promise<JoinRefusal | undefined>;
  isInTheRoom(player: string): Promise<boolean>;
  /** Whether `player` is in the room while it has no game in progress. */
  isInTheLobby(player: string): Promise<boolean>;
  /** Who is in the room, as `viewer` sees it after the last change they were told about. */
  playersSeenBy(viewer: string): Promise<PlayerView[]>;
  /** `player` takes an avatar nobody else in the room has; it returns that avatar. */
  chooseAnotherFreeAvatar(player: string): Promise<string>;

  settingsSeenBy(viewer: string): Promise<SettingsView>;
  changeSettings(host: string, changes: Partial<SettingsView>): Promise<void>;
  /** Whether `player` has any way to change the configuration. */
  canChangeSettings(player: string): Promise<boolean>;

  /** `player` adds a dilemma of the catalog suitable for the room that nobody added yet. */
  addDilemma(player: string): Promise<void>;
  /** As `addDilemma`; whether it was added. */
  tryToAddAnotherDilemma(player: string): Promise<boolean>;
  /** The ids of the dilemmas added by the players, as `viewer` sees them. */
  addedDilemmasSeenBy(viewer: string): Promise<string[]>;
  /** Who `viewer` can tell added each dilemma, from everything they see of the added dilemmas. */
  authorsOfAddedDilemmasSeenBy(viewer: string): Promise<string[]>;
  /** `player` removes the first added dilemma they may: any for the host, their own for anyone else. */
  removeAddedDilemma(player: string): Promise<void>;
  /** The ids of the dilemmas of the catalog that a search of `player` shows, for what they typed. */
  searchDilemmas(player: string, text?: string): Promise<string[]>;
  pickDilemmas(host: string, dilemmaIds: string[]): Promise<void>;
  /** `host` goes back to a game by categories, leaving the picked dilemmas at once. */
  playByCategories(host: string): Promise<void>;
  /** The ids of the dilemmas the host picked, as `viewer` sees them. */
  pickedDilemmasSeenBy(viewer: string): Promise<string[]>;
  catalogEntryOf(dilemmaId: string): CatalogEntry;

  expel(host: string, player: string): Promise<void>;
  /** Whether `host` has any way to expel `player`. */
  canExpel(host: string, player: string): Promise<boolean>;

  /** `host` starts the game. If the room has fewer players than it needs, the driver brings them in. */
  startGame(host: string): Promise<void>;
  /** `host` tries to start the game with the players in the room. */
  tryToStartGame(host: string): Promise<void>;
  /** The game in progress in the room, as `player` sees it; undefined in the lobby. */
  currentGameSeenBy(player: string): Promise<string | undefined>;
  /** The ids of the dilemmas of the game in progress, in the order every player gets them. */
  dilemmasOfTheGame(): Promise<string[]>;
  settingsOfTheGame(): Promise<GameSettingsView>;

  /** How many new dilemmas the room server is configured to reserve in a game of that many dilemmas. */
  newDilemmasSetForGamesOf(dilemmaCount: number): number;

  // Decision phase

  /** The host starts the game and every player opens it. */
  startDecisionPhase(): Promise<void>;
  answerDilemmas(player: string, count: number): Promise<void>;
  progressSeenBy(viewer: string, player: string): Promise<number | undefined>;
  /** Everything every other player received, of any kind and about anyone. */
  messagesReceivedByOthers(player: string): Promise<object[]>;
  /** The votes the driver cast for `player`, to look for them where they must not be. */
  votesCastBy(player: string): Promise<string[]>;
  /** `player` answers again the dilemma in that position (from 1), with a different vote. */
  changeVote(player: string, position: number): Promise<void>;
  /** Every vote the driver cast for `player` in the dilemma in that position (from 1), in order. */
  votesCastFor(player: string, position: number): Promise<string[]>;
  /** The vote that counts for `player` in the dilemma in that position (from 1), as the game keeps it. */
  voteRecordedFor(player: string, position: number): Promise<string | undefined>;
  /** The votes that count for `player`, in the order of the dilemmas, as the game keeps them. */
  votesRecordedFor(player: string): Promise<string[]>;

  /** The connection of `player` closes, as when the network drops. */
  disconnect(player: string): Promise<void>;
  /** `player` opens a new connection from the same device. */
  reconnect(player: string): Promise<void>;
  /** The position (from 1) of the dilemma `player` gets now: the first one they have not answered. */
  dilemmaShownTo(player: string): Promise<number>;
  /** Whether `viewer` sees `player` as connected, from what `viewer` received. */
  connectionSeenBy(viewer: string, player: string): Promise<boolean | undefined>;

  /** The text of the dilemma in that position (from 1) as `player` sees it, with the gap filled. */
  dilemmaTextSeenBy(player: string, position: number): Promise<string>;
  /** The texts of the options of the dilemma in that position as `player` sees them, in order. */
  optionsSeenBy(player: string, position: number): Promise<string[]>;
  /** Who takes the gap of each dilemma of the game that has it, by its position (from 1). */
  peopleInTheGap(): Promise<Map<number, string>>;
  /** The text the game keeps of the dilemma in that position, with the gap unfilled. */
  textKeptFor(position: number): Promise<string>;
  answerRecordedFor(player: string, position: number): Promise<RecordedAnswer | undefined>;
  /** Positions (from 1) of the dilemmas `player` is recorded as "did not vote" for. */
  didNotVoteRecordedFor(player: string): Promise<number[]>;
  /** Everything every player received or can ask for about the game, of any kind. */
  everythingPlayersSee(): Promise<object[]>;

  /** What `player` declared in the first access, before the game starts. Only in the application. */
  declare(player: string, declaration: Declaration): Promise<void>;
  /** Time passes for everyone. Only in the application. */
  letTimePass(seconds: number): Promise<void>;
  /** The total time of the game runs out, and every device notices. */
  runOutTotalTime(): Promise<void>;
  /** Who `viewer` sees as not finished once the time ran out, by name. */
  stragglersSeenBy(viewer: string): Promise<string[]>;

  /** `player` votes the dilemma they are on, with the option given or the first one. */
  vote(player: string, option?: string): Promise<void>;
  /** As `vote`, on a dilemma they have not voted; whether they could predict anything. */
  canMakePredictions(player: string): Promise<boolean>;
  predictMatch(player: string, count: number): Promise<void>;
  predictVotes(
    player: string,
    predictions: readonly { readonly player: string; readonly vote: string }[],
  ): Promise<void>;
  /** The players whose vote `player` predicts in the dilemma in that position, by name. */
  predictionSubsetOf(player: string, position: number): Promise<string[]>;
  /** How many players each player predicts at most, as the game is set up. */
  predictionLimit(): number;
  /** How many times each player was in the subset of anyone, over the whole game. */
  timesEachPlayerWasPredicted(): Promise<Map<string, number>>;
  /** What the predictions of `player` scored in each dilemma; empty until the reveal. */
  pointsOf(
    player: string,
  ): Promise<
    { readonly position: number; readonly match: number | null; readonly votes: number | null }[]
  >;

  /** `player` reports the dilemma they are on. */
  report(player: string, reason: ReportReason): Promise<void>;
  /** `player` takes the skip the screen offers once they reported the dilemma as offensive. */
  skipReportedDilemma(player: string): Promise<void>;
  startReveal(host: string): Promise<void>;
  /** Whether `player` has a way to start the reveal now. */
  canStartReveal(player: string): Promise<boolean>;
  /** Whether `viewer` is in the reveal, from what they received. */
  isInTheReveal(viewer: string): Promise<boolean>;
  /** Who `viewer` sees as the host during the game, by name. */
  hostSeenBy(viewer: string): Promise<string>;
  /** `player` leaves the game on purpose. */
  leave(player: string): Promise<void>;
}
