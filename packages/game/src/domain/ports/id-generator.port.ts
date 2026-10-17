/** Generates the ids of rooms, games and players. The database stores them; it never creates them. */
export interface IdGenerator {
  generate(): string;
}
