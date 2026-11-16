import { GoogleAuth } from 'google-auth-library';
import type { SiteFiles } from './site-files.port.ts';

const API = 'https://storage.googleapis.com/storage/v1';
const UPLOAD = 'https://storage.googleapis.com/upload/storage/v1';

/**
 * The files in a bucket of Cloud Storage, through its JSON API, as the service account of the job,
 * which writes them, or of the service, which may only read them.
 */
export class CloudStorageSiteFiles implements SiteFiles {
  readonly #bucket: string;
  readonly #auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/devstorage.read_write',
  });

  constructor(bucket: string) {
    this.#bucket = bucket;
  }

  async list(): Promise<ReadonlyMap<string, string>> {
    const found = new Map<string, string>();
    let pageToken: string | undefined;
    do {
      const query = new URLSearchParams({ fields: 'items(name,md5Hash),nextPageToken' });
      if (pageToken) query.set('pageToken', pageToken);
      const response = await this.#fetch(`${API}/b/${this.#bucket}/o?${query}`);
      const page = (await response.json()) as {
        readonly items?: readonly { readonly name: string; readonly md5Hash: string }[];
        readonly nextPageToken?: string;
      };
      for (const { name, md5Hash } of page.items ?? []) found.set(name, md5Hash);
      pageToken = page.nextPageToken;
    } while (pageToken);
    return found;
  }

  async put(name: string, body: string, contentType: string): Promise<void> {
    const query = new URLSearchParams({ uploadType: 'media', name });
    await this.#fetch(`${UPLOAD}/b/${this.#bucket}/o?${query}`, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
    });
  }

  async get(name: string): Promise<string | undefined> {
    const response = await this.#fetch(
      `${API}/b/${this.#bucket}/o/${encodeURIComponent(name)}?alt=media`,
      {},
      [404],
    );
    return response.status === 404 ? undefined : response.text();
  }

  async remove(name: string): Promise<void> {
    await this.#fetch(
      `${API}/b/${this.#bucket}/o/${encodeURIComponent(name)}`,
      { method: 'DELETE' },
      [404],
    );
  }

  async #fetch(url: string, init: RequestInit = {}, allowed: readonly number[] = []) {
    const headers = new Headers(init.headers);
    for (const [key, value] of await this.#auth.getRequestHeaders()) headers.set(key, value);
    const response = await fetch(url, { ...init, headers });
    if (!response.ok && !allowed.includes(response.status)) {
      throw new Error(
        `Cloud Storage answered ${response.status} to ${init.method ?? 'GET'} ${url}`,
      );
    }
    return response;
  }
}
