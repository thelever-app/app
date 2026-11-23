/** What Moderation needs of the dilemmas of the catalog, which another context keeps. */
export interface ModeratedDilemmas {
  /**
   * The dilemma a notice points to by its link or its number in the catalog; null if it points to
   * none, such as a room and a nickname.
   */
  dilemmaOf(reference: string): Promise<string | null>;
  /** Its text, for the issue and for whoever reported it; null if there is no such dilemma. */
  textOf(dilemmaId: string): Promise<string | null>;
  /** Out of new games, with its translations, until the team decides. */
  hide(dilemmaId: string): Promise<void>;
  /** Back to what it was before the reports hid it. */
  restore(dilemmaId: string): Promise<void>;
  /** Out of new games for good, with its translations: loading the catalog does not bring it back. */
  withdraw(dilemmaId: string): Promise<void>;
}
