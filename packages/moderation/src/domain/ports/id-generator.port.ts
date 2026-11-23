/** Generates the ids of issues, reports, notices and moderation notices. The database never creates them. */
export interface IdGenerator {
  generate(): string;
}
