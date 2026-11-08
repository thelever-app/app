import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import { AcceptanceDriver } from './acceptance-driver.ts';
import type { GameDriver, RoomChoices, SettingsView } from './driver.ts';
import { E2eDriver } from './e2e-driver.ts';
import { e2eStack } from './e2e-stack.ts';

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

  /** The dilemmas a step found or picked, for a later step to look at. */
  dilemmas: readonly string[] = [];
  /** What the last search of a step showed. */
  found: readonly string[] = [];

  /** The game in progress before a step tried to start one. */
  gameBefore: string | undefined;

  /** Whether the last thing a step tried was accepted. */
  accepted: boolean | undefined;

  /** The avatar a step chose. */
  avatar: string | undefined;

  /** The position (from 1) of the dilemma a step talks about as "it" or "that dilemma". */
  position: number | undefined;

  /** The options a step named, in lower case as the scenario writes them. */
  options: readonly string[] = [];

  /** The vote predictions a step made. */
  predictions: readonly { readonly player: string; readonly vote: string }[] = [];

  #host: string | undefined;
  #choices: RoomChoices = {};
  #roomCreated = false;
  #gameRequested = false;
  #gameStarted = false;

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
    }
    if (!this.#host) throw new Error('The room has no host');
    return this.#host;
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

  /** The scenario plays a game; it starts once a step needs it, so earlier steps can set it up. */
  requestGame(): void {
    this.#gameRequested = true;
  }

  /** The game of the scenario, which the host starts with everyone if no step has yet. */
  async game(): Promise<void> {
    if (this.#gameStarted) return;
    await this.host();
    await this.driver.startDecisionPhase();
    this.#gameStarted = true;
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
