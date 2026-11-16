import { createHash } from 'node:crypto';
import type { SiteFiles } from './site-files.port.ts';

/** The files in memory, for the tests and the acceptance profile. */
export class InMemorySiteFiles implements SiteFiles {
  readonly #files = new Map<string, string>();

  async list(): Promise<ReadonlyMap<string, string>> {
    return new Map([...this.#files].map(([name, body]) => [name, md5Of(body)]));
  }

  async put(name: string, body: string): Promise<void> {
    this.#files.set(name, body);
  }

  async get(name: string): Promise<string | undefined> {
    return this.#files.get(name);
  }

  async remove(name: string): Promise<void> {
    this.#files.delete(name);
  }
}

/** The hash Cloud Storage keeps of each object: MD5, in base64. */
export function md5Of(body: string): string {
  return createHash('md5').update(body).digest('base64');
}
