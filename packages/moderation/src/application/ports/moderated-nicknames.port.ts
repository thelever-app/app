/** What Moderation needs of the nicknames of the players, which the Game context keeps. */
export interface ModeratedNicknames {
  /** In every open room where that player goes by that nickname, it becomes a generic one. */
  withdraw(owner: string, nickname: string): Promise<void>;
}
