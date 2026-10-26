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
}
