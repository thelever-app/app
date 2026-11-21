/** Generates the ids of the reports. The database stores them; it never creates them. */
export interface IdGenerator {
  generate(): string;
}
