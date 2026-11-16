/** Where the generated site is kept, file by file, apart from the service that answers with it. */
export interface SiteFiles {
  /** The name of each file kept, with a hash of its content, to write only what changed. */
  list(): Promise<ReadonlyMap<string, string>>;
  put(name: string, body: string, contentType: string): Promise<void>;
  /** Its content; none if there is no such file. */
  get(name: string): Promise<string | undefined>;
  remove(name: string): Promise<void>;
}
