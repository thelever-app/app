/** Generates the ids of dilemmas and their options. The database stores them; it never creates them. */
export interface IdGenerator {
  generate(): string;
}
