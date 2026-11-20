import type { Category, DilemmaType, Scale } from '@thelever-app/game';

/** What the host chooses on the screen to create a room; the driver picks test data for the rest. */
export interface RoomChoices {
  /** The ambience the room is created with; Classic unless the scenario says. */
  readonly ambience?: 'classic' | 'spicy' | 'no-filter';
  readonly place?: string;
  /** The language of the device, which the room takes for its dilemmas. */
  readonly deviceLanguage?: string;
}

/** What the open settings of the lobby show, before the host saves them. */
export interface OpenSettingsView {
  /** The ambience the settings name, or custom. */
  readonly ambience: string;
  readonly variant: 'nominal' | 'anonymous';
  readonly adultsOnly: boolean;
  readonly compromisingDilemmas: boolean;
}

/** The presets of a room. */
export type Ambience = 'classic' | 'spicy' | 'no-filter';

/** What the dilemma of a random round must be besides its categories. */
export type ContentRequirement = 'adults-only' | 'compromising';

/** What a random round draws: every requirement marked, in this order; none is any content. */
export type RoundContent = readonly ContentRequirement[];

/**
 * Why something for adults or compromising is off: a player under 18, someone under 18 in the
 * room, or a room that is not anonymous.
 */
export type OffReason = 'only-adults' | 'minor-in-room' | 'only-anonymous';

/** An ambience as a screen offers it: with its description and example, or off and why. */
export interface AmbienceOption {
  readonly ambience: Ambience;
  /** Whether it shows a line that describes it and an example dilemma. */
  readonly described: boolean;
  readonly offBecause: OffReason | null;
}

/** A switch of the settings: whether it is on, and whether it is off for the host and why. */
export interface SwitchView {
  readonly on: boolean;
  readonly offBecause: OffReason | null;
}

/** A dilemma the search shows, with the marks it carries. */
export interface MarkedDilemma {
  readonly dilemmaId: string;
  readonly markedAdultsOnly: boolean;
  readonly markedCompromising: boolean;
}

/** The configuration of the room apart from its rounds, as a player of the lobby sees it. */
export interface SettingsView {
  readonly variant: string;
  readonly adultsOnly: boolean;
  readonly compromisingDilemmas: boolean;
  readonly timePerDilemmaSeconds: number;
  readonly newDilemmas: boolean;
}

/** A round as the host sets it, by where its dilemma comes from. */
export type RoundSetting =
  /** A dilemma of those categories at random, of any content unless given; null, of every one. */
  | {
      readonly origin: 'random';
      readonly categories: readonly Category[] | null;
      readonly content?: RoundContent;
    }
  | { readonly origin: 'specific'; readonly dilemmaId: string }
  /** A player chooses it in the lobby. */
  | { readonly origin: 'players' };

/** A round as a player of the lobby sees it; of the players, with the dilemma someone chose, if any. */
export type RoundView =
  | {
      readonly origin: 'random';
      readonly categories: readonly Category[] | null;
      readonly content: RoundContent;
    }
  | { readonly origin: 'specific'; readonly dilemmaId: string }
  | { readonly origin: 'players'; readonly dilemmaId: string | null };

/** What a player sees of a room before entering it. */
export interface RoomPreview {
  readonly host: string;
  /** The ambience whose configuration the room has, or custom. */
  readonly ambience: string;
  readonly variant: string;
  readonly adultsOnly: boolean;
  readonly compromisingDilemmas: boolean;
  readonly playerCount: number;
  /** The avatars of who is inside, in the order they came in, as `PlayerView` writes them. */
  readonly avatars: readonly string[];
}

/** A player of the room as another one sees them in the lobby. */
export interface PlayerView {
  readonly nickname: string;
  /** Face and colour, as one text: two players with the same one would look the same. */
  readonly avatar: string;
}

/** What the game copied from the room when it started. */
export interface GameSettingsView {
  /** The ambience whose configuration the room had when the game started, or custom. */
  readonly ambience: string;
  readonly variant: string;
  readonly place: string;
  readonly dilemmaLanguage: string;
  readonly timePerDilemmaSeconds: number;
}

/** Test data the driver loaded: what a dilemma is, to check what a game or a search returns. */
export interface CatalogEntry {
  readonly text: string;
  readonly minimumAge: number;
  readonly category: Category;
  readonly status: 'in-catalog' | 'in-exploration';
  readonly type: DilemmaType;
  readonly scale: Scale;
  /** Whether its text or an option has the gap "someone in the group". */
  readonly hasGap: boolean;
  /** Whether an honest answer can show a player up before someone in the room. */
  readonly compromising: boolean;
}

/** The share of an option in a distribution prediction, by the text of the option. */
export interface PredictedShareView {
  readonly option: string;
  readonly share: number;
}

/** What the game keeps of the answer of a player to a dilemma. */
export interface RecordedAnswer {
  /** The text of the option voted, as the test data writes it; null for the person in the gap. */
  readonly vote: string | null;
  /** By the name the scenario gives each predicted player, with the text of the option. */
  readonly votePredictions: readonly { readonly player: string; readonly vote: string }[];
  /** The texts of the options in the order the voter saw them. */
  readonly optionOrder: readonly string[];
  readonly responseTimeSeconds: number | null;
  /** In an anonymous room, the share of each option, in the order the voter saw them; null in a nominal one. */
  readonly distributionPrediction: readonly PredictedShareView[] | null;
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
export type JoinRefusal = 'room-does-not-exist' | 'room-full' | 'expelled' | 'adults-only';

/**
 * What a scenario can do and observe, in the words of the ubiquitous language.
 * Step definitions only talk to this interface; each profile plugs in its own implementation.
 *
 * Players are named by the scenario. A nickname that two players share is told apart by the name
 * the scenario gives each of them (`player`) and the nickname they confirm (`nickname`).
 */
/** How a step wants a player to answer the dilemma of the round; the driver fills in the rest. */
export interface AnswerPlan {
  /** The text of the option; the first one of the dilemma unless it says. */
  readonly vote?: string;
  /** False makes no vote prediction, which leaves the answer incomplete in a nominal room. */
  readonly votePredictions?: boolean;
  /** In an anonymous room, the share of each option; the even split unless it says. */
  readonly distribution?: readonly PredictedShareView[];
  /** In an anonymous room, false leaves the prediction without Ready. */
  readonly ready?: boolean;
  /** In a nominal room, the vote predictions, by name and text; the first option for everyone unless it says. */
  readonly predictions?: readonly { readonly player: string; readonly vote: string }[];
}

/** What a player sees of their distribution prediction on the dilemma of the round. */
export interface DistributionPredictionView {
  /** The share of each option, in the order the player sees the options. */
  readonly shares: readonly number[];
  /** The position (from 0), in that order, of the option marked as their vote. */
  readonly vote: number;
}

/** A player in the ranking, by the name the scenario gives them. */
export interface RankedView {
  readonly player: string;
  /** From 1, shared on a tie. */
  readonly position: number;
  readonly points: number;
  readonly mentalist: boolean;
  /** In a nominal room, the names of the titles they won, as the badges next to them say. */
  readonly titles: readonly string[];
}

/** What a player sees at the end of the game. */
export interface EndOfTheGameView {
  /** By their nicknames. */
  readonly stillInTheRoom: readonly string[];
  readonly gone: readonly string[];
  /** The ranking of the game, as at the end of its results. */
  readonly ranking: readonly RankedView[];
  /** In a nominal room, every title of the game with who won it; none in an anonymous one. */
  readonly titles: readonly TitleView[];
}

/** The screen of the results a player is on. */
export type ResultsScreenView =
  | {
      readonly kind: 'title';
      /** Its name, as the game shows it. */
      readonly title: string;
      /** Each winner, or pair of Almas gemelas, by the names the scenario gives them. */
      readonly winners: readonly (readonly string[])[];
      /** Whether each winner is shown with their avatar and the fact that earned it. */
      readonly withAvatarsAndFacts: boolean;
      readonly runnersUp: readonly (readonly string[])[];
    }
  | { readonly kind: 'known-best'; readonly by: readonly string[] }
  | { readonly kind: 'ranking' };

/** A title of the game and who won it, by the names the scenario gives them. */
export interface TitleView {
  readonly title: string;
  readonly winners: readonly (readonly string[])[];
}

/** What a player sees of the reactions in the reveal of the round. */
export interface ReactionsView {
  /** Each emoji the dilemma got, who reacted with it (none in an anonymous room) and how many. */
  readonly dilemma: readonly {
    readonly emoji: string;
    readonly by: readonly string[];
    readonly count: number;
  }[];
  readonly votes: readonly {
    readonly by: string;
    readonly about: string;
    readonly emoji: string;
  }[];
}

/** What the game keeps of a reaction, with its seal. */
export interface RecordedReaction {
  readonly by: string;
  /** Whose vote it is a reaction to; null for the dilemma. */
  readonly about: string | null;
  /** The dilemma, by its position (from 1). */
  readonly position: number;
  readonly emoji: string;
  readonly researchConsent: boolean;
  readonly commercialLicenceConsent: boolean;
  readonly underEighteen: boolean;
}

/** What is kept of a like, with its seal. */
export interface RecordedLike {
  readonly researchConsent: boolean;
  readonly commercialLicenceConsent: boolean;
  readonly underEighteen: boolean;
}

/** The card a player has open to share. */
export interface CardView {
  /** Its big line: the place, or how many dilemmas the group played. */
  readonly headline: string;
  /** The names of the titles on it. */
  readonly titles: readonly string[];
  /** Whose avatars are on it, by the names the scenario gives them. */
  readonly avatarsOf: readonly string[];
  /** Whose nicknames are on it, by the names the scenario gives them. */
  readonly nicknamesOf: readonly string[];
  /** The dilemma on it as the one that divided the group the most, by its position (from 1). */
  readonly mostDivisive: number | null;
}

/** What a player sees of the reveal of a dilemma, by the names the scenario gives the players. */
export interface RevealView {
  /** The position (from 1) of the dilemma. */
  readonly position: number;
  /** How many chose each option, by its text; null when too few voted to show it. */
  readonly distribution: readonly { readonly option: string; readonly count: number }[] | null;
  readonly tooFewVotes: boolean;
  readonly didNotVoteCount: number;
  /** What each player voted, null for who did not vote; empty in an anonymous room. */
  readonly votes: readonly { readonly player: string; readonly vote: string | null }[];
  /** Whether each vote prediction was right. */
  readonly votePredictions: readonly {
    readonly player: string;
    readonly about: string;
    readonly right: boolean;
  }[];
  readonly personInTheGap: string | null;
  /** In a nominal room, how many of the votes they predict the person in the gap guessed. */
  readonly personInTheGapHits: { readonly right: number; readonly of: number } | null;
  readonly chosenBy: string | null;
  /** Whether it shows a total of points of anyone. */
  readonly showsPoints: boolean;
  /** In an anonymous room, the share the player predicted of each option. */
  readonly ownDistributionPrediction: readonly PredictedShareView[] | null;
  /** The points the player scored in the dilemma, which only they see. */
  readonly ownPoints: number | null;
}

/** The legal documents the first access asks for. */
export type LegalDocument = 'terms-of-use' | 'game-consent';

/**
 * Where the first access of a device is, as its screen shows it: the welcome, the year of birth
 * and the month, the stop under the minimum age or in a blocked country, the terms of use, the
 * game consent, the new terms, the cookie manager, and then the start of the app or the room of
 * the invitation it came from.
 */
export type FirstAccessScreen =
  | 'age'
  | 'month'
  | 'under-minimum-age'
  | 'blocked-country'
  | 'terms'
  | 'game-consent'
  | 'new-terms'
  | 'cookies'
  | 'home'
  | 'join';

/** A device a scenario of the first access brings in, by where it is and what its browser sends. */
export interface DeviceOptions {
  /** The country its address is in, by its ISO code. */
  readonly country: string;
  /** Whether its browser sends Global Privacy Control. */
  readonly globalPrivacyControl?: boolean;
}

export interface GameDriver {
  // The first access. Every player a scenario brings in has finished it as an adult, unless the
  // scenario gives them a device that has never used TheLever.

  /** A device of `user` that has never used TheLever. */
  newDevice(user: string, options: DeviceOptions): Promise<void>;
  /** `user` opens the app on their device, or the invitation link to the room of the scenario. */
  openApp(user: string, from?: 'invitation'): Promise<void>;
  /** `user` declares an age: the year of birth and, if asked, the month that makes it that age. */
  declareAge(user: string, age: number): Promise<void>;
  /** `user` chooses a year of birth and goes on, without the month. */
  chooseBirthYear(user: string, year: number): Promise<void>;
  /** `user` accepts the terms of use on the screen that asks for them. */
  acceptTerms(user: string): Promise<void>;
  /** `user` does not accept the terms of use. */
  declineTerms(user: string): Promise<void>;
  /** `user` gives the game consent, and goes on with what the screen asked for. */
  giveGameConsent(user: string): Promise<void>;
  /** `user` answers the cookie manager. */
  answerCookieConsent(user: string): Promise<void>;
  firstAccessScreenOf(user: string): Promise<FirstAccessScreen>;
  /** Whether a choice of the screen of `user` comes chosen: the year, the month or the game consent. */
  preselected(user: string, choice: 'year' | 'month' | 'game-consent'): Promise<boolean>;
  /** Whether the screen of `user` says a minimum age. */
  mentionsMinimumAge(user: string): Promise<boolean>;
  /** The full texts `user` can open from the screen they are on. */
  legalTextsOfferedTo(user: string): Promise<readonly ('terms' | 'privacy')[]>;
  /** Whether the game consent `user` sees says it has changed. */
  toldTheGameConsentChanged(user: string): Promise<boolean>;
  /** Whether `user` can reach anything of the app: creating a room or joining one. */
  canUseTheApp(user: string): Promise<boolean>;
  /** The version of the document the room server keeps as accepted by `user`, if any. */
  acceptedVersionOf(user: string, document: LegalDocument): Promise<number | undefined>;
  /** The version of the document published now. */
  currentVersionOf(document: LegalDocument): Promise<number>;
  /** `user` finishes the first access as an adult in the EEA, on the device they have. */
  finishFirstAccess(user: string): Promise<void>;
  /** `user` had accepted a version of the document that is no longer enough. */
  acceptedAnEarlierVersion(user: string, document: LegalDocument): Promise<void>;
  /** A new version of the document that must be accepted again is published. */
  publishVersionThatAsksAgain(document: LegalDocument): Promise<void>;
  /** What the app keeps of the first access of `user`, by its fields. Only in the application. */
  keptFirstAccessOf(user: string): Promise<Readonly<Record<string, unknown>>>;

  // The first access on the device only (@screen).

  /** The points the game consent tells before its boxes, in order. */
  consentPointsShownTo(user: string): Promise<readonly string[]>;
  /** Whether the game consent says why it is asked apart. */
  toldWhyTheConsentIsApart(user: string): Promise<boolean>;
  /** `user` opens how TheLever is funded from the game consent; whether it shows. */
  openHowTheLeverIsFunded(user: string): Promise<boolean>;
  /** Whether the device of `user` keeps that its ads may be personalised. */
  personalisedAdsAllowedFor(user: string): Promise<boolean>;
  /** Whether `user` is told that Global Privacy Control rejects personalised ads. */
  toldAboutGlobalPrivacyControl(user: string): Promise<boolean>;
  /** The browser of `user` offers to install the app, which is not installed. */
  browserOffersToInstall(user: string): Promise<void>;
  /** `user` reaches the start of the app. */
  reachHome(user: string): Promise<void>;
  /** Whether the start offers `user` to install the app. */
  offeredToInstall(user: string): Promise<boolean>;
  /** `user` closes the offer to install the app. */
  closeInstallOffer(user: string): Promise<void>;
  /** Days pass on the device of `user`. */
  letDaysPassOnTheDevice(user: string, days: number): Promise<void>;
  /** `user` plays a game of one round with another player, to its end. */
  finishAGame(user: string): Promise<void>;
  /** The points the notice of an anonymous room tells `player` before the first dilemma. */
  anonymousNoticeShownTo(player: string): Promise<readonly string[]>;

  /** Prepares whatever the driver needs before a scenario. */
  start(): Promise<void>;
  /** Releases everything the driver opened during the scenario. */
  stop(): Promise<void>;

  // Lobby

  /** `host` opens the screen to create a room, which shows them a random avatar. */
  openRoomCreation(host: string): Promise<void>;
  /**
   * `host` creates a room from the home screen, with a nickname, the nature of the group and the
   * place, and the avatar the screen shows them.
   */
  createRoom(host: string, choices?: RoomChoices): Promise<void>;
  /**
   * What `host` was asked on the single screen that created the room: their nickname, the place
   * where the group plays and, if it were still asked, the nature of the group.
   */
  askedOnCreation(host: string): Promise<readonly ('nickname' | 'place' | 'nature')[]>;
  isHost(player: string): Promise<boolean>;
  /** The code of the room, as `player` sees it in the lobby or, during the game, in its menu. */
  roomCodeSeenBy(player: string): Promise<string>;
  /** Whether the invitation link `player` can share, from the lobby or the game, takes whoever opens it to the room. */
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
  /** `player` presses the button to enter with the code they typed, and sees the room or why not. */
  enterTypedCode(player: string): Promise<void>;
  /** Whether `player` is still on the join screen, with no room opened by the code they typed. */
  isOnJoinCodeScreen(player: string): Promise<boolean>;
  roomPreviewSeenBy(player: string): Promise<RoomPreview | undefined>;
  /** `player` types a nickname on the screen to join, without confirming it. Only on the device (@screen). */
  typeNickname(player: string, nickname: string): Promise<void>;
  /**
   * The nickname of whoever `player` is told already has the nickname they typed, if anyone. Only
   * on the device (@screen): the screen warns, the room decides nothing until they join.
   */
  namesakeWarningSeenBy(player: string): Promise<string | undefined>;
  /** `player` confirms a nickname for the room they opened, and tries to enter with their avatar. */
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
  /** The avatar `player` sees as theirs: on the screen to create or join a room, or in the room. */
  avatarSeenBy(player: string): Promise<string>;
  /**
   * `player` takes, on the screen they are on, another avatar that nobody in the room has; it
   * returns that avatar.
   */
  chooseAnotherAvatar(player: string): Promise<string>;
  /** `player` tries to take that avatar, as `PlayerView` writes it, on the screen they are on. */
  chooseAvatar(player: string, avatar: string): Promise<void>;
  /** Whether `player` is asked to choose another avatar, since someone with their nickname has it. */
  askedToChooseAnotherAvatar(player: string): Promise<boolean>;

  settingsSeenBy(viewer: string): Promise<SettingsView>;
  changeSettings(host: string, changes: Partial<SettingsView>): Promise<void>;
  /** Whether `player` has any way to change the configuration. */
  canChangeSettings(player: string): Promise<boolean>;

  /**
   * The rounds of the room in the order the game plays them, as `viewer` sees them. Rounds are
   * named by their position, from 1, as people count them.
   */
  roundsSeenBy(viewer: string): Promise<RoundView[]>;
  /** `host` sets all the rounds at once on the settings screen, keeping the others as they are. */
  setRounds(host: string, rounds: readonly RoundSetting[]): Promise<void>;
  /** `host` changes that round on the settings screen, and the others stay; whether the room took it. */
  tryToSetRound(host: string, round: number, setting: RoundSetting): Promise<boolean>;
  /** `host` adds a random round of every category at the end; whether the room took it. */
  tryToAddRound(host: string): Promise<boolean>;
  /** `host` removes that round; whether the room took it. */
  tryToRemoveRound(host: string, round: number): Promise<boolean>;
  /** `player` chooses that dilemma for that round of the players in the lobby; whether the round got it. */
  chooseRoundDilemma(player: string, round: number, dilemmaId: string): Promise<boolean>;
  /** Whether `player` has any way to choose the dilemma of that round. */
  canChooseRoundDilemma(player: string, round: number): Promise<boolean>;
  /** `player` takes out the dilemma they chose for that round. */
  clearRoundDilemma(player: string, round: number): Promise<void>;
  /** Whether `player` has any way to take out the dilemma of that round. */
  canClearRoundDilemma(player: string, round: number): Promise<boolean>;
  /** Who `viewer` can tell chose the dilemma of a round of the players, from everything they see of the rounds. */
  choosersSeenBy(viewer: string): Promise<string[]>;
  /**
   * The minimum of players the lobby of `viewer` warns a dilemma about someone in the group of its
   * rounds needs; none without a warning.
   */
  gapWarningSeenBy(viewer: string): Promise<number | undefined>;
  /**
   * The device of `player` has played those dilemmas of the catalog. A player already in the room
   * enters it again, since the device says it on entering. Only in the application.
   */
  playedOnTheirDevice(player: string, dilemmaIds: readonly string[]): Promise<void>;
  /** The ids of the dilemmas of the catalog that a search of `player` shows first, for what they typed. */
  searchDilemmas(player: string, text?: string): Promise<string[]>;
  /** The ids of each of the first `pages` pages of a search of `player`, asking for more after each one. */
  searchDilemmaPages(player: string, pages: number): Promise<string[][]>;
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

  // Ambiences, compromising dilemmas and the content of the rounds.
  /** The ambiences the screen to create a room offers the player, in order. */
  ambiencesToCreateWith(player: string): Promise<AmbienceOption[]>;
  /** Whether one of them is chosen before the player chooses. */
  ambienceChosenBeforehand(player: string): Promise<boolean>;
  /** Whether the room can be created with everything else filled in and no ambience. */
  canCreateRoomWithoutAmbience(player: string): Promise<boolean>;
  /** The ambience of the room the lobby says, or custom. */
  ambienceSeenBy(viewer: string): Promise<string>;
  /** In the settings of the lobby, which stay open, filled in with its configuration. */
  chooseAmbience(host: string, ambience: Ambience): Promise<void>;
  /** `host` turns on the anonymous reveal in the settings they have open, without saving. */
  markAnonymousOnTheOpenSettings(host: string): Promise<void>;
  /** What the settings `host` has open show; undefined if they are closed. */
  openSettingsSeenBy(host: string): Promise<OpenSettingsView | undefined>;
  /** The ambiences the settings of the lobby offer the host. */
  ambiencesInTheSettings(host: string): Promise<AmbienceOption[]>;
  adultsOnlySwitchSeenBy(host: string): Promise<SwitchView>;
  compromisingSwitchSeenBy(host: string): Promise<SwitchView>;
  /** Of the contents of that random round, those the host cannot choose. */
  contentsOffFor(host: string, round: number): Promise<ContentRequirement[]>;
  /** What the search for the dilemma of that round shows, with its marks. */
  searchWithMarks(player: string, round: number): Promise<MarkedDilemma[]>;
  /** Whether the player is told the game includes compromising dilemmas, and can stay or leave. */
  warnedAboutCompromisingDilemmas(player: string): Promise<boolean>;
  leaveFromTheWarning(player: string): Promise<void>;
  /** Whether the search of the lobby tells the player it only shows dilemmas that suit the room. */
  onlySuitableDilemmasExplainedTo(player: string): Promise<boolean>;
  /** The rounds of the room the visitor created from a public page, as its host sees them. */
  roundsOfTheVisitorRoom(): Promise<RoundView[]>;
  /** The ambience the lobby of the room of the visitor says, or custom. */
  ambienceOfTheVisitorRoom(): Promise<string>;
  settingsOfTheGame(): Promise<GameSettingsView>;

  /** How many new dilemmas the room server is configured to reserve in a game with that many random rounds. */
  newDilemmasSetForRandomRounds(count: number): number;

  // Rounds

  /**
   * The host starts the game and every player opens it. With a number of dilemmas, the game has
   * that many rounds: those a step set keep their setting, and the host makes the others specific
   * with dilemmas of the test data with the two usual options.
   */
  startDecisionPhase(dilemmaCount?: number): Promise<void>;
  /** Everything every other player received, of any kind and about anyone. */
  messagesReceivedByOthers(player: string): Promise<object[]>;
  /** The votes the driver cast for `player`, to look for them where they must not be. */
  votesCastBy(player: string): Promise<string[]>;

  /**
   * `player` answers the dilemma of the round in full: the vote given or the first option and, in a
   * nominal room, the first option for each vote prediction.
   */
  answer(player: string, plan?: AnswerPlan): Promise<void>;
  /** Whether `player` sees that the dilemma of the round is about them. */
  aboutThemSeenBy(player: string): Promise<boolean>;
  /** Whether `player` has any way to vote the dilemma of the round. */
  canVote(player: string): Promise<boolean>;
  /** `player` votes the dilemma of the round, with the option given or the first one. */
  vote(player: string, option?: string): Promise<void>;
  /** `player` changes the vote of the dilemma of the round to the option given or another one. */
  changeVote(player: string, option?: string): Promise<void>;
  /** Every vote the driver cast for `player` in the dilemma in that position (from 1), in order. */
  votesCastFor(player: string, position: number): Promise<string[]>;
  /** `player` uses the app in that language from now on, and reads the dilemmas in it. */
  usesTheAppIn(player: string, language: string): Promise<void>;
  /** The language the room plays its dilemmas in, which nobody sees. */
  languageOfTheRoom(): Promise<string>;
  /** Whether the settings of the lobby offer `host` a language for the dilemmas. */
  settingsOfferALanguage(host: string): Promise<boolean>;
  /** The text of the dilemma of that round of the lobby as `viewer` sees it; none without one. */
  roundTextSeenBy(viewer: string, round: number): Promise<string | undefined>;
  /** The language the answer of `player` to the dilemma in that position says they read it in. */
  languageReadBy(player: string, position: number): Promise<string | null>;
  /** The option of the dilemma in that position (from 1), as the room plays it, with that text in any case. */
  optionOfTheRoomCalled(position: number, text: string): Promise<string>;
  /** The vote that counts for `player` in the dilemma in that position (from 1), as the game keeps it. */
  voteRecordedFor(player: string, position: number): Promise<string | undefined>;
  /** Whether `player` could answer the dilemma of the round now. */
  canAnswer(player: string): Promise<boolean>;
  /** Whether the dilemma of the round counts as answered by `player`, as the game keeps it. */
  hasAnswered(player: string): Promise<boolean>;
  /** Whether `viewer` sees that `player` has answered the dilemma of the round; null if they cannot tell. */
  answeredSeenBy(viewer: string, player: string): Promise<boolean | null>;
  /** How many `viewer` sees have answered the dilemma of the round. */
  answeredCountSeenBy(viewer: string): Promise<number>;
  /** Whether anything a player receives tells who answered the dilemma of the round. */
  whoAnsweredIsSent(): Promise<boolean>;
  /** Whether `player` waits for the others: they answered and the dilemma is not revealed. */
  isWaiting(player: string): Promise<boolean>;
  /** The seconds `viewer` sees left for the dilemma of the round. */
  timeLeftSeenBy(viewer: string): Promise<number>;

  /** The connection of `player` closes, as when the network drops. */
  disconnect(player: string): Promise<void>;
  /** `player` opens a new connection from the same device. */
  reconnect(player: string): Promise<void>;
  /** As `reconnect`, but the room may not take the player back: says whether it did. */
  tryToReconnect(player: string): Promise<boolean>;
  /** The position (from 1) of the dilemma of the round `player` is on. */
  dilemmaShownTo(player: string): Promise<number>;
  /** Whether `viewer` sees `player` as connected, from what `viewer` received. */
  connectionSeenBy(viewer: string, player: string): Promise<boolean | undefined>;

  /** The text of the dilemma in that position (from 1) as `player` sees it, with the gap filled. */
  dilemmaTextSeenBy(player: string, position: number): Promise<string>;
  /** The texts of the options of the dilemma in that position as `player` sees them, in order. */
  optionsSeenBy(player: string, position: number): Promise<string[]>;
  /** Who takes the gap of each dilemma of the game that has it, by its position (from 1). */
  peopleInTheGap(): Promise<Map<number, string>>;
  /** The position (from 1) of the dilemma that `player` chose in the lobby. */
  positionChosenBy(player: string): Promise<number>;
  /** The text the game keeps of the dilemma in that position, with the gap unfilled. */
  textKeptFor(position: number): Promise<string>;
  answerRecordedFor(player: string, position: number): Promise<RecordedAnswer | undefined>;
  /** Positions (from 1) of the dilemmas `player` is recorded as "did not vote" for. */
  didNotVoteRecordedFor(player: string): Promise<number[]>;
  /** Everything every player received or can ask for about the game, of any kind. */
  everythingPlayersSee(): Promise<object[]>;

  /** What `player` declared in the first access, before the game starts. Only in the application. */
  declare(player: string, declaration: Declaration): Promise<void>;
  /** Time passes for everyone. */
  letTimePass(seconds: number): Promise<void>;
  /** The scheduled job deletes the closed rooms, as it does every hour. Only in the application. */
  deleteClosedRooms(): Promise<void>;
  /** Whether anything of the room of the scenario or of its games is kept. Only in the application. */
  isGameDataKept(): Promise<boolean>;
  /** The time for the dilemma of the round runs out, and every device notices. */
  runOutRound(): Promise<void>;
  /** `host` reveals the dilemma of the round early. */
  revealEarly(host: string): Promise<void>;
  /** Whether `player` has a way to reveal the dilemma of a round early. */
  canRevealEarly(player: string): Promise<boolean>;
  /** What `viewer` sees of the reveal of the dilemma of the round; undefined in its decision phase. */
  revealSeenBy(viewer: string): Promise<RevealView | undefined>;
  /**
   * How each prediction of `viewer` about someone who voted went, as their reveal shows it next to
   * each vote; the reveal never shows them the predictions of anyone else.
   */
  ownPredictionsSeenBy(
    viewer: string,
  ): Promise<{ readonly about: string; readonly right: boolean }[]>;
  /** `player` moves on from the reveal of the round to the next one. */
  moveOn(player: string): Promise<void>;
  /** The players move on from the reveal of the round at the same time. */
  moveOnTogether(players: readonly string[]): Promise<void>;
  /** Who `viewer` sees moved everyone to the round they are on; null for the first. */
  movedOnSeenBy(viewer: string): Promise<string | null>;
  /** Whether the notice of who moved on leaves the dilemma uncovered on the screen of `viewer`. Only on screen. */
  moveOnNoticeCoversNothing(viewer: string): Promise<boolean>;
  /** Whether that notice goes away by itself. Only on screen. */
  moveOnNoticeDisappears(viewer: string): Promise<boolean>;
  /** Whether `player` has a way to see the reveal of a past round again. */
  canGoBack(player: string): Promise<boolean>;

  /** As `vote`, on a dilemma they have not voted; whether they could predict anything. */
  canMakePredictions(player: string): Promise<boolean>;
  predictVotes(
    player: string,
    predictions: readonly { readonly player: string; readonly vote: string }[],
  ): Promise<void>;
  /** The players whose vote `player` predicts in each dilemma, by name, as the room tells them. */
  playersToPredictBy(player: string): Promise<string[]>;

  // The distribution prediction, in an anonymous room

  /** Votes, if they had not, and leaves the prediction at those shares, without Ready. */
  predictDistribution(player: string, shares: readonly PredictedShareView[]): Promise<void>;
  /** Moves the option in that position (from 0), in the order the player sees them, to that share. */
  moveDistributionShare(player: string, option: number, share: number): Promise<void>;
  pressReady(player: string): Promise<void>;
  canPredictDistribution(player: string): Promise<boolean>;
  distributionPredictionSeenBy(player: string): Promise<DistributionPredictionView | undefined>;
  /** How many sliders the player moves to predict the distribution (@screen). */
  distributionSlidersSeenBy(player: string): Promise<number>;

  // Reactions and likes, in the reveal of the round

  /** `player` reacts in the reveal of the round to the vote of `to`, or to the dilemma for null. */
  react(player: string, to: string | null, emoji?: string): Promise<void>;
  reactionsSeenBy(viewer: string): Promise<ReactionsView>;
  /** Every reaction the game keeps. Only in the application, or in its database. */
  reactionsRecorded(): Promise<RecordedReaction[]>;
  /** `player` gives «Buen dilema» to the dilemma of the reveal of the round. */
  like(player: string): Promise<void>;
  /**
   * `player` takes back «Buen dilema»: from the reveal they are in, or, only below the application,
   * to the dilemma in that position (from 1) once its reveal is over.
   */
  unlike(player: string, position?: number): Promise<void>;
  /** The like of `player` to the dilemma in that position (from 1), as it is kept. */
  likeRecordedFor(player: string, position: number): Promise<RecordedLike | undefined>;
  /** What the likes of the dilemma in that position (from 1) weigh for its rating. */
  likesCountedFor(position: number): Promise<number>;
  /** `player` gave «Buen dilema» to the dilemma in that position (from 1) in a game before this one. */
  likedBefore(player: string, position: number): Promise<void>;
  /** The seconds the group spent on the reveal of the dilemma in that position (from 1), as kept. */
  timeSpentRecordedFor(position: number): Promise<number | null>;

  // The game results and the end

  /** The ranking, as the player sees it, once the rounds are over. */
  rankingSeenBy(viewer: string): Promise<readonly RankedView[] | undefined>;
  /** Whether the player sees the titles of the game or who knows them best. */
  titlesSeenBy(viewer: string): Promise<boolean>;
  /** The screen of the results the player is on; undefined out of the results. */
  resultsScreenSeenBy(viewer: string): Promise<ResultsScreenView | undefined>;
  /** The screen of the results the device of `viewer` shows, from 0: behind the group's if they look back (@screen). */
  resultsScreenShownTo(viewer: string): Promise<number>;
  /** `player` looks back, on their device alone, at the screen of the results before (@screen). */
  goBackInTheResults(player: string): Promise<void>;
  /** Every title of the game with a winner, in the order they are shown. */
  titlesOfTheGame(): Promise<TitleView[]>;
  endOfTheGameSeenBy(viewer: string): Promise<EndOfTheGameView | undefined>;
  /** `host` starts the rematch from the end of the game. */
  startRematch(host: string): Promise<void>;
  /** Whether `player` has a way to start the rematch. */
  canStartRematch(player: string): Promise<boolean>;
  /** `host` restarts the game in progress from the menu of the game, and confirms it. */
  restartGame(host: string): Promise<void>;
  /** Whether `player` is offered to restart the game in progress. */
  canRestartGame(player: string): Promise<boolean>;
  /** The stage the room keeps for the game of the scenario: rounds, results, ended or stopped. */
  stageOfTheGame(): Promise<string>;
  /** The positions (from 1) of the dilemmas of the game the room counts as played. */
  playedInTheRoom(): Promise<number[]>;
  /** The rounds (from 1) the lobby of `viewer` says have no dilemmas left the room has not played. */
  roundsWithoutNewDilemmasSeenBy(viewer: string): Promise<number[]>;
  /** `player` opens their card, or that of the group, to share it. */
  openCard(player: string): Promise<CardView>;
  /** `player` turns on, on the card they have open, the nicknames of the others. */
  showNicknamesOnTheCard(player: string): Promise<CardView>;
  /** What the vote predictions of `player` scored in each dilemma revealed so far; null for none made. */
  pointsOf(
    player: string,
  ): Promise<{ readonly position: number; readonly points: number | null }[]>;

  /** `player` reports the dilemma of the round. */
  report(player: string, reason: ReportReason): Promise<void>;
  /** `player` takes the skip the screen offers once they reported the dilemma as offensive. */
  skipReportedDilemma(player: string): Promise<void>;
  /** Who `viewer` sees as the host during the game, by name. */
  hostSeenBy(viewer: string): Promise<string>;
  /** `player` leaves the game on purpose. */
  leave(player: string): Promise<void>;

  // Sound and motion: they happen only on the device (@screen).

  /** The moments whose sound the screen of `player` played since it last opened, in order. */
  soundsHeardBy(player: string): Promise<string[]>;
  /** How many times the device of `player` vibrated since its screen last opened. */
  vibrationsOf(player: string): Promise<number>;
  /** Whether the device of `player` could play a sound now: its audio running, every sound loaded. */
  canSound(player: string): Promise<boolean>;
  /** `player` mutes the game from the screen they are on: the lobby or the menu of the game. */
  mute(player: string): Promise<void>;
  /** Whether the screen of `player` shows the game muted. */
  isMuted(player: string): Promise<boolean>;
  /** `player` closes the app and opens it again on the same device, and touches the screen. */
  reopenApp(player: string): Promise<void>;
  /** The device of `player` asks for reduced motion; before their screen first opens. */
  reduceMotionFor(player: string): void;
  /** What moved or changed size on the screen of `player` since it last opened. */
  movementsSeenBy(player: string): Promise<string[]>;
  /** The time per dilemma of the round reaches its last seconds on every screen. */
  reachLastSeconds(): Promise<void>;

  /**
   * The curation team approves a new dilemma in the curated catalog and the catalog is loaded
   * into the app; returns its id. Only in the application.
   */
  curationTeamCreatesADilemma(): Promise<string>;
  /** Whether the public dilemma with that id has that status at its current version. Only in the application. */
  dilemmaHasStatus(dilemmaId: string, status: 'in-catalog' | 'in-exploration'): Promise<boolean>;

  /**
   * The curation team approves a dilemma with that name in the curated catalog, for everyone unless
   * for adults, not compromising unless said, without reviewed arguments, and the catalog is loaded
   * into the app.
   */
  catalogDilemmaNamed(
    name: string,
    facts?: { readonly minimumAge?: 16 | 18; readonly compromising?: boolean },
  ): Promise<void>;
  /** A dilemma of a player with that name, private or in exploration. Only in the application. */
  dilemmaOutsideTheCatalogNamed(name: string, kind: 'private' | 'in-exploration'): Promise<void>;
  /** The curation team reviews the arguments of the dilemma, and the catalog is loaded again. */
  reviewArgumentsOf(name: string): Promise<void>;
  /** The curation team discards the dilemma, and the catalog is loaded again. */
  removeFromTheCatalog(name: string): Promise<void>;
  /** The job generates the public web from the catalog, as every day. */
  generatePublicPages(): Promise<void>;
  /** The public page of the dilemma in that language as a visitor opens it; none if it has none. */
  publicPageOf(name: string, language: string): Promise<PublicPageView | undefined>;
  /** A visitor on the public page of the dilemma in Spanish chooses that language in its menu. */
  switchLanguageOfThePublicPage(name: string, language: string): Promise<PublicPageView>;
  /** The status code the address of the public page of the dilemma answers with. */
  statusOfThePublicPageOf(name: string): Promise<number>;
  /** Whether the sitemap of the public web lists the page of the dilemma. */
  sitemapIncludes(name: string): Promise<boolean>;
  /** A visitor chooses to play the dilemma with the group on its public page, in Spanish unless said. */
  playWithTheGroupFromThePublicPage(name: string, language?: string): Promise<void>;
  /** A visitor with a device in Spanish who never chose a language in the app. */
  visitorWithoutAChosenLanguage(): Promise<void>;
  /** The language the app the visitor opened from the public web is in. */
  languageOfTheApp(): Promise<string | undefined>;
  /** Whether the public page the visitor has open shows an ad in the space below the arguments. */
  bannerAdBelowTheArguments(): Promise<boolean>;
  /** A visitor chooses to vote and see what the world did on the public page of the dilemma, in Spanish. */
  voteFromThePublicPage(name: string): Promise<void>;
  /** The dilemma the app the visitor opened offers to vote alone, if it offers one. */
  dilemmaReadyToVoteAlone(): Promise<string | undefined>;
  /** A visitor follows a link of the app to vote the dilemma alone, without going through its public page. */
  openTheAppToVoteAlone(name: string): Promise<void>;
  /** Whether the app the visitor opened says the dilemma to vote alone is not available. */
  dilemmaToVoteIsUnavailable(): Promise<boolean>;
  /** The visitor is on a device that has never used TheLever, in the EEA. */
  visitorOnANewDevice(): Promise<void>;
  /** The screen of the first access, or of the app, the visitor is on. */
  firstAccessScreenOfTheVisitor(): Promise<FirstAccessScreen>;
  /** The visitor finishes the first access where the app has it, as an adult of 30. */
  visitorFinishesTheFirstAccess(): Promise<void>;
  /** The visitor votes the dilemma alone in the app: its first option, predicting that half the world voted the same. */
  voteAlone(name: string): Promise<void>;
  /** The answers the world result of the dilemma counts, once the results of the day are published. */
  worldAnswersOf(name: string): Promise<number>;
  /** Whether anything kept links the visitor to the option they voted. */
  voteOfTheVisitorIsKept(): Promise<boolean>;
  /** The dilemma, in the general catalog with its arguments reviewed, has that many answers in its published world result. */
  dilemmaWithWorldAnswers(name: string, answers: number): Promise<void>;
  /** What the visitor sees of the world result after voting alone. */
  worldResultSeen(): Promise<WorldResultView>;
  /** The visitor creates the room the screen offers to play the dilemma with the group. */
  createTheRoomOfTheDilemma(ambience?: Ambience): Promise<void>;
  /** The name of the dilemma the screen to create the room says the game starts with, before creating it. */
  startingDilemmaShownToTheVisitor(): Promise<string | undefined>;
  /** The name of the specific dilemma of round 1 of the room the visitor created; none if it is not specific. */
  firstRoundDilemmaOfTheVisitorRoom(): Promise<string | undefined>;
}

/** What the visitor sees of the world result of a dilemma after voting it alone. */
export interface WorldResultView {
  /** Whether it says there are still too few answers to show it. */
  readonly tooFewAnswers: boolean;
  /** The percentages it shows, as the screen writes them. */
  readonly figures: readonly string[];
}

/** What a visitor sees on the public page of a dilemma. */
export interface PublicPageView {
  readonly language: string;
  readonly text: string;
  readonly options: readonly string[];
  /** For and against each option, in the order of the options; none without reviewed arguments. */
  readonly arguments: readonly { readonly for: string; readonly against: string }[];
  /** Who created it, if the page said it. */
  readonly author?: string;
  /** How the world voted, if the page said it. */
  readonly worldResult?: string;
  /** The languages of the other versions it links to. */
  readonly otherLanguages: readonly string[];
  /** Whether search engines may index it. */
  readonly indexable: boolean;
}
