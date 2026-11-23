import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { Category } from '@thelever-app/game';
import { AcceptanceDriver } from './acceptance-driver.ts';
import type {
  AnswerPlan,
  CardView,
  ContactView,
  GameDriver,
  ModerationNoticeView,
  CreditsView,
  DonationLinks,
  FundingView,
  PublicPageView,
  RoomChoices,
  RoundSetting,
  SettingsView,
  MarkedDilemma,
  SupportLineView,
} from './driver.ts';
import { E2eDriver } from './e2e-driver.ts';
import { e2eStack } from './e2e-stack.ts';
import { TWO_OPTION_DILEMMA_IDS } from './test-catalog.ts';

/** The names the steps give to the people a scenario does not name. */
export const SOMEONE = {
  host: 'Host',
  player: 'Player',
  anotherPlayer: 'Newcomer',
} as const;

/** One instance per scenario, shared by its steps through `this`. */
export class GameWorld extends World {
  readonly driver: GameDriver;

  /** The answer a step changed, so a later step can refer to it as "that dilemma". */
  changedAnswer: { readonly player: string; readonly position: number } | undefined;

  /** The player who reconnected, so a later step can refer to them as "his". */
  reconnectedPlayer: string | undefined;

  /** The players a step looked through, so a later step can refer to them as "they" or "she". */
  viewers: readonly string[] = [];

  /** Who the scenario calls "the player" right now. */
  player: string = SOMEONE.player;

  /** Everyone in the room, by the name the scenario gives them, in the order they entered. */
  readonly inRoom = new Set<string>();

  /** Who left the game or is disconnected now: their screen does not follow the game. */
  readonly away = new Set<string>();

  /** The configuration a step changed, to compare with what a later step sees. */
  changes: Partial<SettingsView> = {};

  /** The rounds a step set, to compare with what a later step sees. */
  rounds: readonly RoundSetting[] = [];

  /** The round (from 1) a step talks about as "it" or "the round". */
  round: number | undefined;

  /** The categories a step set for a round. */
  categories: readonly Category[] = [];

  /** Who, besides the player who took it out, could take out the dilemma of a round just before. */
  couldClear: ReadonlyMap<string, boolean> = new Map();

  /** Whether a step tried to start the game, so a later one says whether it started. */
  triedToStartTheGame = false;

  /** The dilemmas a step found or picked, for a later step to look at. */
  dilemmas: readonly string[] = [];
  /** What the last search of a step showed. */
  found: readonly string[] = [];

  /** The dilemma of the test data a step made the first one of the game. */
  dilemmaId = '';
  /** The moderation notices a player saw when they opened the app. */
  moderationNotices: readonly ModerationNoticeView[] = [];

  /** The dilemma of the public web a scenario talks about as "it", by its name. */
  dilemmaName = '';

  /** The public page a visitor has open. */
  publicPage: PublicPageView | undefined;

  /** Where the pages of the public web a visitor opened link to the donation page, in the order opened. */
  donationLinks: readonly DonationLinks[] = [];

  /** How TheLever is funded, as the settings of the app told the player. */
  funding: FundingView | undefined;

  /** What the credits of the settings showed the player. */
  credits: CreditsView | undefined;
  /** «Contact and reports», as the settings showed it. */
  contact: ContactView | undefined;

  /** The dilemma a visitor chose to play with the group from its public page, by its name. */
  dilemmaToPlayWithTheGroup: string | undefined;
  /** What the last search with marks showed. */
  marked: readonly MarkedDilemma[] | undefined;

  /** The game in progress before a step tried to start one. */
  gameBefore: string | undefined;

  /** Whether the last thing a step tried was accepted. */
  accepted: boolean | undefined;

  /** The avatar a step chose or saw. */
  avatar: string | undefined;

  /** The nickname a step typed, before confirming it. */
  nickname: string | undefined;

  /** The position (from 1) of the dilemma a step talks about as "it" or "that dilemma". */
  position: number | undefined;

  /** The options a step named, in lower case as the scenario writes them. */
  options: readonly string[] = [];

  /** The vote predictions a step made. */
  predictions: readonly { readonly player: string; readonly vote: string }[] = [];

  /** How many rounds the game plays, besides those a step set; the room decides if unset. */
  dilemmaCount: number | undefined;

  /** The variant a step said the room has; the room decides if unset. */
  variant: 'nominal' | 'anonymous' | undefined;

  /** The options of the dilemma of the round in the order the player saw them before voting. */
  optionsSeen: readonly string[] = [];

  /** What the player saw of their distribution prediction after each move a step made. */
  distributionsSeen: readonly (readonly number[])[] = [];

  /**
   * How each player answers the dilemma in each position (from 1) when a step brings the game to
   * its reveal: their plan, or null for who does not vote. Who is not in it answers in full.
   */
  readonly plans = new Map<number, Map<string, AnswerPlan | null>>();

  /**
   * The reactions each player makes in the reveal of the dilemma in each position (from 1) when a
   * step brings the game to it: to the vote of a player, or to the dilemma for null.
   */
  readonly reactions = new Map<
    number,
    { readonly player: string; readonly to: string | null; readonly emoji: string }[]
  >();

  /** What a step does once the rounds are over, before the game ends. */
  readonly beforeTheEnd: (() => Promise<void>)[] = [];

  /** The dilemmas of the test data the scenario calls by a name, by that name. */
  readonly #named = new Map<string, string>();

  #host: string | undefined;
  #choices: RoomChoices = {};
  #roomCreated = false;
  #gameRequested = false;
  #gameStarted = false;
  #endRequested = false;
  #ended = false;

  constructor(options: IWorldOptions) {
    super(options);
    const { driver } = options.parameters;
    if (driver === 'acceptance') this.driver = new AcceptanceDriver();
    else if (driver === 'e2e') this.driver = new E2eDriver(e2eStack());
    else throw new Error(`Unknown driver: ${driver}`);
  }

  /** `host` is on the screen to create a room; the room exists once a step needs it. */
  beginRoomCreation(host: string, choices: RoomChoices = {}): void {
    if (this.#roomCreated) throw new Error('The scenario creates a second room');
    this.#host = host;
    this.#choices = { ...this.#choices, ...choices };
  }

  /** What the host chooses on the screen to create the room, before it exists. */
  chooseOnCreation(choices: RoomChoices): void {
    if (this.#roomCreated) throw new Error('The room already exists');
    this.#choices = { ...this.#choices, ...choices };
  }

  /** The host of the room of the scenario, who creates it if no step has yet. */
  async host(): Promise<string> {
    if (!this.#roomCreated) {
      const host = this.#host ?? SOMEONE.host;
      await this.driver.createRoom(host, this.#choices);
      this.#host = host;
      this.#roomCreated = true;
      this.inRoom.add(host);
      if (this.variant === 'anonymous') {
        await this.driver.changeSettings(host, { variant: 'anonymous' });
      }
    }
    if (!this.#host) throw new Error('The room has no host');
    return this.#host;
  }

  /** Whether a step has created the room of the scenario. */
  get roomCreated(): boolean {
    return this.#roomCreated;
  }

  /** The room is hosted by `host`, who creates it if no step has yet. */
  async hostIs(host: string): Promise<void> {
    if (!this.#roomCreated) this.beginRoomCreation(host);
    if ((await this.host()) !== host) throw new Error(`The scenario says ${host} is the host`);
  }

  /** `player` is in the room of the scenario, and joins it if no step has brought them in yet. */
  async isInTheRoom(player: string, nickname = player): Promise<void> {
    await this.host();
    if (this.inRoom.has(player)) return;
    await this.driver.joinRoom(player, nickname);
    this.inRoom.add(player);
  }

  /** The avatar of a player of the room, by their nickname, as the host sees it. */
  async avatarOf(nickname: string): Promise<string> {
    const seen = await this.driver.playersSeenBy(await this.host());
    const avatar = seen.find((player) => player.nickname === nickname)?.avatar;
    if (!avatar) throw new Error(`Nobody called ${nickname} is in the room`);
    return avatar;
  }

  /** The scenario plays a game; it starts once a step needs it, so earlier steps can set it up. */
  requestGame(): void {
    this.#gameRequested = true;
  }

  /** The game of the scenario, which the host starts with everyone if no step has yet. */
  async game(): Promise<void> {
    if (this.#gameStarted) return;
    await this.host();
    await this.driver.startDecisionPhase(this.dilemmaCount);
    this.#gameStarted = true;
  }

  /**
   * The scenario plays a game to its end, once its Givens have set it up: the first When or Then
   * plays it (see the hooks).
   */
  requestEnd(): void {
    this.requestGame();
    this.#endRequested = true;
  }

  /** Whether the game of the scenario is played to its end, or will be. */
  get endRequested(): boolean {
    return this.#endRequested;
  }

  /** Whether a step started the game of the scenario. */
  get gameStarted(): boolean {
    return this.#gameStarted;
  }

  /** Whether a step already played the game of the scenario to its end. */
  get ended(): boolean {
    return this.#ended;
  }

  /** The card the player has open, as the last step opened or changed it. */
  card: CardView | undefined;

  /** The line to support TheLever the player saw at the end of the game; none if they saw none. */
  supportLine: SupportLineView | undefined;

  /** The screen of the results a player was on before looking back, from 0. */
  resultsScreenBefore: number | undefined;

  /** The seconds a step recorded the group spent on a dilemma, which nobody must see. */
  timeSpentSeconds: number | undefined;

  /** Plays the game to its end if the scenario asked for it and no step has yet. */
  async endIfRequested(): Promise<void> {
    if (!this.#endRequested || this.#ended) return;
    this.#ended = true;
    await this.toTheResults();
    for (const step of this.beforeTheEnd) await step();
    await this.throughTheResults();
  }

  /** The game is on the first screen of its results: every round played as its plans say. */
  async toTheResults(): Promise<void> {
    await this.game();
    const last = (await this.driver.dilemmasOfTheGame()).length;
    await this.toRevealOf(last);
    const viewer = this.present()[0];
    if (!viewer) throw new Error('Nobody is left to move on to the results');
    if (!(await this.driver.resultsScreenSeenBy(viewer))) await this.everyoneMovesOn();
  }

  /** From the screen of the results everyone is on, everyone moves on to the end. */
  async throughTheResults(): Promise<void> {
    const viewer = this.present()[0];
    if (!viewer) throw new Error('Nobody is left to move on to the end');
    while (!(await this.driver.endOfTheGameSeenBy(viewer))) await this.everyoneMovesOn();
  }

  /**
   * Every player present is ready to move on from the reveal or the screen of the results the
   * group is on, so everyone moves on.
   */
  async everyoneMovesOn(): Promise<void> {
    for (const player of this.present()) await this.driver.getReadyToMoveOn(player);
  }

  /** The plan of `player` for the dilemma in that position, which a later step follows. */
  plan(position: number, player: string, plan: AnswerPlan | null): void {
    const plans = this.plans.get(position) ?? new Map<string, AnswerPlan | null>();
    plans.set(player, plan);
    this.plans.set(position, plans);
  }

  /**
   * The game is on the decision phase of the round of the dilemma in that position (from 1): each
   * earlier round is revealed, as its plans say, and everyone moves on.
   */
  async toRound(position: number): Promise<void> {
    await this.game();
    const host = await this.host();
    for (let current = await this.driver.dilemmaShownTo(host); current < position; current += 1) {
      await this.toRevealOf(current);
      await this.everyoneMovesOn();
    }
  }

  /**
   * The game is on the reveal of the dilemma in that position (from 1): whoever is present and has
   * not answered answers as their plan says, and the host reveals it if someone did not vote.
   */
  async toRevealOf(position: number): Promise<void> {
    await this.toRound(position);
    const host = await this.host();
    if ((await this.driver.revealSeenBy(host))?.position === position) return;
    const plans = this.plans.get(position);
    for (const player of this.present()) {
      const plan = plans?.get(player);
      if (plan === null || (await this.driver.hasAnswered(player))) continue;
      await this.driver.answer(player, plan);
    }
    if (!(await this.driver.revealSeenBy(host))) await this.driver.revealEarly(host);
    for (const { player, to, emoji } of this.reactions.get(position) ?? []) {
      await this.driver.react(player, to, emoji);
    }
  }

  /**
   * The dilemma of the test data the scenario calls by that name: one with the two usual options,
   * the same for the same name, from the last ones so as not to be one the game takes for a round.
   */
  dilemmaCalled(name: string): string {
    const named = this.#named.get(name);
    if (named) return named;
    const taken = new Set(this.#named.values());
    const dilemmaId = TWO_OPTION_DILEMMA_IDS.findLast((candidate) => !taken.has(candidate));
    if (!dilemmaId) throw new Error(`The test data has no dilemma left to call "${name}"`);
    this.#named.set(name, dilemmaId);
    return dilemmaId;
  }

  /** A dilemma of the test data with the two usual options that is in no round and has no name. */
  async unusedDilemma(): Promise<string> {
    const rounds = await this.driver.roundsSeenBy(await this.host());
    const taken = new Set([
      ...this.#named.values(),
      ...rounds.flatMap((round) =>
        round.origin !== 'random' && round.dilemmaId ? [round.dilemmaId] : [],
      ),
    ]);
    const dilemmaId = TWO_OPTION_DILEMMA_IDS.find((candidate) => !taken.has(candidate));
    if (!dilemmaId) throw new Error('The test data has no dilemma left that is in no round');
    return dilemmaId;
  }

  /** A step that sets up the game, so it must come before anything starts it. */
  beforeTheGame(): void {
    if (this.#gameStarted) throw new Error('A step sets up the game after it started');
    if (!this.#gameRequested) throw new Error('A step sets up a game the scenario does not play');
  }

  /** Who in the room follows the game on their screen now. */
  present(): string[] {
    return [...this.inRoom].filter((player) => !this.away.has(player));
  }

  /** The players in the room other than its host. */
  async guests(): Promise<string[]> {
    const host = await this.host();
    return [...this.inRoom].filter((player) => player !== host);
  }
}

setWorldConstructor(GameWorld);
