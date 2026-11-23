/** Generates the ids of the deletions. The database stores them; it never creates them. */
export interface IdGenerator {
  generate(): string;
}
