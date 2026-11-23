/**
 * A personal data store: each context that keeps data of a data subject, which exports them and
 * deletes them by identity. Deleting may also unlink, where a law or a decision keeps the rest
 * without the person. Doing it twice does what doing it once did, so a deletion can be done again.
 */
export interface PersonalDataStore {
  /** The section of the downloaded file it fills. */
  readonly section: string;
  /** What it keeps of the identity, as plain JSON data; none if it keeps nothing. */
  export(identity: string): Promise<unknown>;
  erase(identity: string): Promise<void>;
}

/**
 * The game data of an identity (its rooms that are still kept, with their games), which
 * withdrawing the game consent deletes, and nothing else of it.
 */
export interface GameDataOfIdentity {
  erase(identity: string): Promise<void>;
}
