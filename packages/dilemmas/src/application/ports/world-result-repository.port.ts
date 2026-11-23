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
  /**
   * Makes the counts of now the published world result of each version that has at least that many
   * new answers since it was last published; the rest keep the result they had.
   */
  publish(minimumNewAnswers: number): Promise<void>;
  /** Forgets who voted each version that is no longer the current one of its dilemma; its answers stay. */
  forgetReceiptsOfFormerVersions(): Promise<void>;
  /** The versions that identity voted alone, by their mark: never the option, nor the time. */
  receiptsOf(identity: string): Promise<{ readonly dilemmaId: string; readonly version: number }[]>;
  /** Forgets every mark of that identity; the answers it added stay, counted without anyone. */
  forgetReceiptsOf(identity: string): Promise<void>;
  /** The published answers to each option of that version, by position; an option nobody voted has none. */
  publishedCountsOf(dilemmaId: string, version: number): Promise<ReadonlyMap<number, number>>;
}
