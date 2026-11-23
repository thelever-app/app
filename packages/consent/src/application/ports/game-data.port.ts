/**
 * The game data of an identity: its rooms that are still kept, with their games, its answers and
 * reactions and what others predicted or reacted about it. Withdrawing the game consent deletes them.
 */
export interface GameData {
  erase(identity: string): Promise<void>;
}
