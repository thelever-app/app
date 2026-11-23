/** What Moderation needs of the nicknames of the players, which the Game context keeps. */
export interface ModeratedNicknames {
  /**
   * The nickname a notice points to by the code of a room and the nickname of a player in it, and
   * who goes by it; null if it points to none, or to more than one.
   */
  nicknameOf(
    reference: string,
  ): Promise<{ readonly nickname: string; readonly owner: string } | null>;
  /** In every open room where that player goes by that nickname, it becomes a generic one. */
  withdraw(owner: string, nickname: string): Promise<void>;
}
