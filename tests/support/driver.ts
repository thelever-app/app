/**
 * What a scenario can do and observe, in the words of the ubiquitous language.
 * Step definitions only talk to this interface; each profile plugs in its own implementation.
 */
export interface GameDriver {
  /** Prepares whatever the driver needs before a scenario. */
  start(): Promise<void>;
  /** Releases everything the driver opened during the scenario. */
  stop(): Promise<void>;

  /** `host` creates a room and the other `players` join it. */
  hostRoom(host: string, players: string[]): Promise<void>;
  startDecisionPhase(): Promise<void>;
  answerDilemmas(player: string, count: number): Promise<void>;
  progressSeenBy(viewer: string, player: string): Promise<number | undefined>;
  messagesAbout(player: string): Promise<object[]>;
  /** The votes the driver cast for `player`, to look for them where they must not be. */
  votesCastBy(player: string): Promise<string[]>;
}
