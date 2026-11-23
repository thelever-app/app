/** Generates the ids of the events. The database stores them; it never creates them. */
export interface IdGenerator {
  generate(): string;
}
