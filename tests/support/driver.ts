import type { Category, DilemmaType, Scale } from '@thelever-app/game';

/** What the host chooses on the screen to create a room; the driver picks test data for the rest. */
/** The steps of an answer as the screen shows them: «Tu voto» and «Tu predicción». */
export interface AnswerStepsView {
  readonly steps: readonly ('vote' | 'prediction')[];
  readonly current: 'vote' | 'prediction';
  readonly done: readonly ('vote' | 'prediction')[];
}

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

/** The minimum age a random round asks of its dilemma. */
export type ContentAge = 'any' | 'from-16' | 'adults-only';

/** Whether a random round asks for a compromising dilemma. */
export type ContentCompromising = 'any' | 'no' | 'yes';

/** What the dilemma of a random round must be besides its categories. */
export interface RoundContent {
  readonly age: ContentAge;
  readonly compromising: ContentCompromising;
}

/** Which parts of the content of a random round the host can set. */
export interface ContentChoices {
  readonly age: boolean;
  readonly compromising: boolean;
}

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
  /** The fewest players to start its badge says. */
  readonly minimumPlayers: number;
  /** Whether it carries the badge of an anonymous room. */
  readonly markedAnonymous: boolean;
}

/** The card «Ambiente» of the settings: the ambience it names, or custom, and its badges. */
export interface AmbienceCardView {
  readonly ambience: string;
  readonly minimumPlayers: number;
  readonly markedAnonymous: boolean;
}

/** A round of the settings: whether it is unfolded, and what its summary line says. */
export interface SettingsRoundView {
  readonly number: number;
  readonly unfolded: boolean;
  /** Its number, where its dilemma comes from and its content, as the line reads. */
  readonly summary: string;
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
  /** The fewest players to start the badge next to the ambience says. */
  readonly minimumPlayers: number;
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
export type ReportReason = 'offensive' | 'confusing' | 'badly translated' | 'other';

/** An issue of the moderation repository, as the team sees it there. */
export interface ModerationIssueView {
  readonly title: string;
  readonly body: string;
  readonly comments: readonly string[];
  readonly labels: readonly string[];
}

/** What a person writes in the web form of illegal content. */
export interface IllegalContentNoticeForm {
  /** The link to that dilemma of the catalog; something that names no dilemma without one. */
  readonly dilemmaId?: string;
  readonly name?: string;
  readonly email?: string;
}

/** A moderation notice, as the screen of its player shows it. */
export interface ModerationNoticeView {
  /** About a report the player made, or about their nickname. */
  readonly about: 'report' | 'nickname';
  readonly outcome: 'withdrawn' | 'kept';
  /** The section of the terms of use it names. */
  readonly rule: string | undefined;
  /** Whether it says that a person decided it. */
  readonly byAPerson: boolean;
  /** Whether it says how to appeal. */
  readonly howToAppeal: boolean;
  /** The facts it gives, for a nickname. */
  readonly facts: string | undefined;
}

/** The dilemma a player reported, as the issue of the team should show it. */
export interface ReportedDilemma {
  readonly dilemmaId: string;
  readonly text: string;
}

/** An email the app sent, as its inbox shows it. */
export interface EmailView {
  readonly subject: string;
  readonly text: string;
}

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

/** An invitation to support TheLever with a donation, on the start or at the end of the game. */
export interface SupportInvitationView {
  /** Whether it takes to the donation page of TheLever. */
  readonly takesToTheDonationPage: boolean;
}

/** The line of the end of the game that invites to support TheLever. */
export interface SupportLineView extends SupportInvitationView {
  /** Whether it covers any of the main actions: the rematch or sharing the card. */
  readonly coversTheMainActions: boolean;
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

  // The invitations to donate, on the device only (@screen).

  /** The first access of `user` says that age, and their device opens the app again to learn it. */
  declaredAgeOnTheDevice(user: string, age: number): Promise<void>;
  /** The draw of the end of the game on the device of `user` invites to donate, or not. */
  chanceInvitesToDonate(user: string, invites: boolean): Promise<void>;
  /** The line of the end of the game of `viewer` to support TheLever; none if it shows none. */
  supportLineSeenBy(viewer: string): Promise<SupportLineView | undefined>;
  /** The card of the start of `user` to support TheLever; none if it shows none. */
  supportCardSeenBy(user: string): Promise<SupportInvitationView | undefined>;
  /** `user` closes the card of the start to support TheLever. */
  closeSupportCard(user: string): Promise<void>;

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
  /**
   * In the settings of the lobby, which stay open, filled in with its configuration: the room
   * does not take it until the host saves.
   */
  chooseAmbience(host: string, ambience: Ambience): Promise<void>;
  /** The host chooses the ambience in the settings and saves them. */
  saveAmbience(host: string, ambience: Ambience): Promise<void>;
  /** `host` closes the settings they have open, without saving. */
  closeTheOpenSettings(host: string): Promise<void>;
  /** `host` turns on the anonymous reveal in the settings they have open, without saving. */
  markAnonymousOnTheOpenSettings(host: string): Promise<void>;
  /** What the settings `host` has open show; undefined if they are closed. */
  openSettingsSeenBy(host: string): Promise<OpenSettingsView | undefined>;
  /** The ambiences the settings of the lobby offer the host. */
  ambiencesInTheSettings(host: string): Promise<AmbienceOption[]>;
  adultsOnlySwitchSeenBy(host: string): Promise<SwitchView>;
  compromisingSwitchSeenBy(host: string): Promise<SwitchView>;
  /** Which parts of the content of that random round the host can set. */
  contentChoicesFor(host: string, round: number): Promise<ContentChoices>;
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
  /** The fewest players to start the settings of `host` show for each variant. */
  minimumPlayersOfTheVariantsSeenBy(
    host: string,
  ): Promise<Readonly<Record<'nominal' | 'anonymous', number>>>;
  /** `host` makes the room anonymous in the settings. */
  makeAnonymousInTheSettings(host: string): Promise<void>;
  /** The card «Ambiente» of the settings of `host`. */
  ambienceCardSeenBy(host: string): Promise<AmbienceCardView>;
  /** The fewest players to start the lobby of `viewer` shows next to the ambience. */
  minimumPlayersSeenBy(viewer: string): Promise<number>;
  /** Whether the line of each ambience to create a room with says what it adds to the one before. Only on screen. */
  ambiencesSayWhatTheyAdd(player: string): Promise<boolean>;

  // Who creates the room

  /** Whether each button of the home screen says who presses it. Only on screen. */
  homeSaysWhoCreatesTheRoom(player: string): Promise<{ create: boolean; join: boolean }>;
  /** `host` creates a room apart from the room of the scenario, and stays alone in it; its code. */
  createRoomOfTheirOwn(host: string): Promise<string>;
  /** Whether `player` is alone in the lobby of the room they created apart. */
  isAloneInTheirOwnRoom(player: string): Promise<boolean>;
  /** From the lobby of their own room, `player` enters the code of another room. */
  enterCodeFromTheLobby(player: string, code: string): Promise<void>;
  /** Whether the lobby of `viewer` offers to join another room. Only on screen. */
  offerToJoinAnotherRoomSeenBy(viewer: string): Promise<boolean>;

  // The rounds of the settings, folded

  /** `host` opens the settings of the lobby. Only on screen. */
  openTheSettings(host: string): Promise<void>;
  /** The rounds of the settings `host` has open. Only on screen. */
  roundsOfTheOpenSettings(host: string): Promise<SettingsRoundView[]>;
  /** `host` taps the summary line of that round. Only on screen. */
  toggleRoundInTheSettings(host: string, round: number): Promise<void>;
  /** `host` presses «Listo» in that round, which is unfolded. Only on screen. */
  pressDoneInRound(host: string, round: number): Promise<void>;
  /** `host` adds a round in the settings they have open. Only on screen. */
  addRoundInTheOpenSettings(host: string): Promise<void>;

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
  /** The id of the category `viewer` sees the dilemma of the round is of. */
  categorySeenBy(viewer: string): Promise<string>;
  /** The steps of the answer `viewer` sees, the one they are on and those done. Only on screen. */
  answerStepsSeenBy(viewer: string): Promise<AnswerStepsView>;
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
  /**
   * `player` is ready to move on from the reveal of the round, or from the screen of the results
   * the group is on.
   */
  getReadyToMoveOn(player: string): Promise<void>;
  /** The players are ready to move on from the reveal of the round at the same time. */
  getReadyToMoveOnTogether(players: readonly string[]): Promise<void>;
  /** `host` moves everyone on from the reveal of the round, or from a screen of the results. */
  moveEveryoneOn(host: string): Promise<void>;
  /** Whether `player` has a way to move everyone on without waiting for them to be ready. */
  canMoveEveryoneOn(player: string): Promise<boolean>;
  /** How many of the players `viewer` sees ready to move on, and of how many; null for none. */
  readyToMoveOnSeenBy(
    viewer: string,
  ): Promise<{ readonly ready: number; readonly of: number } | null>;
  /**
   * Who `viewer` sees moved everyone to the round or the screen of the results they are on; null
   * when nobody did.
   */
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
  /** Looking back at the results, `player` comes one screen forward again, on their own. Only on screen. */
  goForwardInTheResults(player: string): Promise<void>;
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

  /** `player` reports the dilemma of the round, in its decision or its reveal, with a comment if given. */
  report(player: string, reason: ReportReason, comment?: string): Promise<ReportedDilemma>;
  /** Whether `player` is offered to report the dilemma of the round. */
  canReport(player: string): Promise<boolean>;
  /** Whether the screen of `player` told them the team will review what they reported. */
  toldTheTeamWillReview(player: string): Promise<boolean>;
  /** Whether anything on the screen of `viewer`, or in what the room told them, says someone reported. */
  knowsAboutAReport(viewer: string): Promise<boolean>;
  /** `player` touches the avatar of `other`, in the lobby or in the reveal, and reports their nickname. */
  reportNickname(player: string, other: string): Promise<void>;

  // Moderation (CU-08 and CU-11)

  /** The job of moderation runs once: the issues reach the repository and the decisions apply. */
  syncModeration(): Promise<void>;
  /** The issues of the moderation repository, the oldest first. */
  moderationIssues(): Promise<ModerationIssueView[]>;
  /** The comments of the reports Moderation keeps, in its database. Only in the application. */
  storedReportComments(): Promise<string[]>;
  /** The team decides the issue of that content in the repository, then the job runs. */
  teamDecides(
    issue: { readonly dilemmaId: string } | { readonly nickname: string } | 'the last one',
    decision: 'withdraw' | 'restore' | 'keep',
  ): Promise<void>;
  /** A dilemma of the catalog that suits any room, for what happens to it outside a game. */
  aCatalogDilemma(): Promise<ReportedDilemma>;
  /** That many different players report that dilemma of the catalog. Only in the application. */
  reportedByDifferentPlayers(dilemmaId: string, count: number): Promise<void>;
  /** Whether the issues of the repository mention `player` by their nickname or their identity. */
  issuesMention(player: string): Promise<boolean>;
  /** Whether a new game may play that dilemma. */
  isPlayableInNewGames(dilemmaId: string): Promise<boolean>;
  /** Someone who does not use the app sends the web form of illegal content. */
  sendIllegalContentNotice(form: IllegalContentNoticeForm): Promise<void>;
  /** Whether the web form said the notice was received. */
  noticeAcknowledged(): Promise<boolean>;
  /** The emails the app sent to that address, the oldest first. Only in the application. */
  emailsTo(address: string): Promise<EmailView[]>;
  /** `player` opens the app: the moderation notices they get, which they then see. */
  moderationNoticesOn(player: string): Promise<ModerationNoticeView[]>;
  /** The nickname `viewer` sees `player` by in the room. */
  nicknameOfIn(viewer: string, player: string): Promise<string>;
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
  /** `player` mutes the game in the settings, from the start of the app. */
  muteInTheSettings(player: string): Promise<void>;
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
  /**
   * Where the page of the public web in Spanish links to the donation page: the home, the first
   * category or the page of the dilemma with that name.
   */
  donationLinksOn(page: 'home' | 'category' | { readonly dilemma: string }): Promise<DonationLinks>;
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
  // Settings: only on the device (@screen).

  /** `user` opens the settings from the start of the app. */
  openSettings(user: string): Promise<void>;
  /** `user`, in the settings, chooses that language for the app. */
  chooseTheLanguageOfTheApp(user: string, language: string): Promise<void>;
  /** The language the screen of `user` is in, if it changed without opening the app again. */
  languageShownTo(user: string): Promise<string | undefined>;
  /** Whether the settings `user` has open offer anything about the declared age. */
  settingsOfferTheAge(user: string): Promise<boolean>;
  /** `user` opens How TheLever is funded from the settings and reads it. */
  fundingSeenInTheSettings(user: string): Promise<FundingView>;
  /** Where the first row of the settings `user` has open leads, if it is the way to donate. */
  firstRowOfTheSettings(
    user: string,
  ): Promise<{ readonly donation: boolean; readonly href?: string }>;
  /** `user` opens Credits and licences from the settings, and its licence notices. */
  creditsSeenInTheSettings(user: string): Promise<CreditsView>;
  /** What «Contact and reports» shows, opened from the settings. Only on the device. */
  contactSeenInTheSettings(user: string): Promise<ContactView>;
  /** The donation page of the environment the app and the web link to. */
  donationPage(): string;

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

  // Privacy and data.

  /** `user` objects to product analytics in the settings. */
  objectToProductAnalytics(user: string): Promise<void>;
  /** How many analytics events the room server keeps of `user`. */
  analyticsEventsOf(user: string): Promise<number>;
  /** `user` opens the app for the first time from a link with those parameters of its origin. */
  openAppFrom(user: string, origin: VisitOriginView): Promise<void>;
  /** Where the first visit of `user` came from, as the room server keeps it. */
  firstVisitOf(user: string): Promise<VisitOriginView | undefined>;
  /**
   * Someone sends the team a request by email to delete the data of `user`, with the code their
   * device shows or without it, and the team carries it out as the request allows.
   */
  sendDataDeletionByEmail(user: string, withTheCode: boolean): Promise<void>;
  /** Whether the last request by email was carried out, and the answer it got when it was not. */
  lastRequestByEmail(): Promise<{ readonly carriedOut: boolean; readonly reply?: string }>;
  /** `user` asks for their data to be deleted in the settings, and confirms it. */
  requestDataDeletion(user: string): Promise<void>;
  /** The deletion job runs, as it does every day. */
  runTheDeletionJob(): Promise<void>;
  /** What the room server keeps of `user`, one section per store, as their downloaded file would. */
  personalDataOf(user: string): Promise<Readonly<Record<string, unknown>>>;
  /** `user`, in Your permissions, chooses to withdraw the game consent: the warning shows. */
  chooseToWithdrawTheGameConsent(user: string): Promise<void>;
  /** What the warning before withdrawing the game consent tells `user`. */
  withdrawalWarningSeenBy(
    user: string,
  ): Promise<{ readonly blocksRooms: boolean; readonly deletesData: boolean }>;
  /** `user` confirms the withdrawal of the game consent. */
  confirmTheWithdrawal(user: string): Promise<void>;
  /** How many answers and reactions of `user` the rooms still kept have. */
  gameDataOf(user: string): Promise<number>;
  /** The code «Your data» shows `user`, and the one the room server keeps of them, as written. */
  requestCodeSeenBy(user: string): Promise<RequestCodeView>;
  /** `user` opens «Delete my data» in the settings. */
  openTheDeletion(user: string): Promise<void>;
  /** What «Delete my data» tells `user` before they confirm. */
  deletionExplainedTo(user: string): Promise<{
    readonly deleted: boolean;
    readonly kept: boolean;
    readonly nicknameAsPlayer: boolean;
  }>;
  /** Whether the device of `user` keeps nothing of them, signed out of their identity. */
  signedOutAtOnce(user: string): Promise<boolean>;
  /** `user` opens «Cookies and ads» in the settings: the cookie manager opens again. */
  openCookieChoices(user: string): Promise<void>;
  /** Whether `user` changes what they allow in the cookie manager opened again, ads included. */
  cookieChoicesChangeableBy(user: string): Promise<boolean>;
}

/** The code for requests by email, as a screen shows it and as the room server keeps it. */
export interface RequestCodeView {
  readonly shown: string | undefined;
  readonly kept: string | undefined;
}

/** Where a first visit came from: the parameters of the link the app opened with. */
export interface VisitOriginView {
  readonly source: string | null;
  readonly campaign: string | null;
  readonly content: string | null;
}

/** What the visitor sees of the world result of a dilemma after voting it alone. */
export interface WorldResultView {
  /** Whether it says there are still too few answers to show it. */
  readonly tooFewAnswers: boolean;
  /** The percentages it shows, as the screen writes them. */
  readonly figures: readonly string[];
}

/** What a visitor sees on the public page of a dilemma. */
/** How TheLever is funded, as the settings of the app tell it. */
export interface FundingView {
  readonly ads: boolean;
  /** That permission to use the games for research may be asked later, optionally and explicitly. */
  readonly researchLater: boolean;
  /** That one can donate, and that it gives no advantage in the game. */
  readonly donationWithoutAdvantage: boolean;
  /** Where the way to donate leads, outside the app. */
  readonly donationPage: string | undefined;
}

/** What the credits of the settings show and link to. */
/** «Contact and reports» of the settings, as the screen shows it. */
export interface ContactView {
  readonly email: string;
  /** The text that says what the email is for and the languages it is answered in. */
  readonly text: string;
  /** Where the link to the web form of illegal content leads. */
  readonly form: string | undefined;
}

export interface CreditsView {
  /** The licence notices of the third-party libraries, by the name of each one. */
  readonly notices: readonly string[];
  readonly creditsDiceBear: boolean;
  /** Where its link to the source code leads. */
  readonly sourceCode: string | undefined;
}

/** Where a page of the public web links to the donation page. */
export interface DonationLinks {
  readonly inTheFooter: boolean;
  /** In a block of its own just before the footer, as the home has it. */
  readonly beforeTheFooter: boolean;
  /** In a line after the arguments, as the page of a dilemma has it. */
  readonly afterTheArguments: boolean;
}

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
