/**
 * Runs a use case that changes something as one command: in PostgreSQL, in a transaction that commits
 * all of it or nothing; in memory, as it is.
 */
export type RunCommand = <T>(command: () => Promise<T>) => Promise<T>;
