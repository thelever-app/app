/** A vote alone as the world result counts it: for a version of the original dilemma, by the position of its option. */
export interface Ballot {
  /** The original, also when the vote was cast on one of its translations. */
  readonly dilemmaId: string;
  /** The version of the original, which the translation translates if it was cast on one. */
  readonly version: number;
  readonly position: number;
}

/**
 * The answers of the world to each dilemma. It keeps who voted each version, to count them once,
 * and how many voted each option, but never who voted what. What the app reads is what was last
 * published, once a day, not the counts of the moment.
 */
export interface WorldResultRepository {
  /** Counts the vote, unless that identity already voted that version: then nothing changes and it answers false. */
  countVote(identity: string, ballot: Ballot): Promise<boolean>;
  /** Makes the counts of now the published world result of every dilemma. */
  publish(): Promise<void>;
  /** The published answers to each option of that version, by position; an option nobody voted has none. */
  publishedCountsOf(dilemmaId: string, version: number): Promise<ReadonlyMap<number, number>>;
}
