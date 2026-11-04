/** What goes with an entry: ids, counts and states, never personal data (IP, nicknames, votes, tokens). */
export type LogFields = Readonly<Record<string, string | number | boolean>>;

/** Where the adapters of this package say what happens; the app decides how it is written. */
export interface Logger {
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  /** `error` is what was thrown, if anything was. */
  error(message: string, error?: unknown, fields?: LogFields): void;
}
