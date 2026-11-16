import { publishedSite } from '../files/publish-site.ts';
import type { SiteFiles } from '../files/site-files.port.ts';
import type { PublishedSite } from '../respond.ts';

/** The site as it was last published, read again when it is old. */
export interface CachedSite {
  /** The site, reading its manifest again once it is older than the time to live. */
  current(): Promise<PublishedSite | undefined>;
  /**
   * The site read again if it is older than `ms`: before answering that an address moved or does
   * not exist, so an instance with an old manifest never sends a visitor back to an old address.
   */
  newerThan(ms: number): Promise<PublishedSite | undefined>;
}

/**
 * The published site, reading its manifest again once it is older than `ttlMs`: a new generation
 * reaches every instance within that time. Requests that find it old share one read, and if the
 * read fails it keeps the site it had, so a moment without Cloud Storage does not take the web down.
 */
export function cachedSite(
  files: SiteFiles,
  ttlMs: number,
  now: () => number = Date.now,
): CachedSite {
  let cached: { readonly site: PublishedSite | undefined; readonly at: number } | undefined;
  let reading: Promise<PublishedSite | undefined> | undefined;

  const read = (): Promise<PublishedSite | undefined> => {
    reading ??= publishedSite(files)
      .then(
        (site) => {
          cached = { site, at: now() };
          return site;
        },
        (error: unknown) => {
          if (cached) return cached.site;
          throw error;
        },
      )
      .finally(() => {
        reading = undefined;
      });
    return reading;
  };
  const olderThan = (ms: number) => !cached || now() - cached.at >= ms;

  return {
    current: async () => (olderThan(ttlMs) ? read() : cached!.site),
    newerThan: async (ms) => (olderThan(ms) ? read() : cached!.site),
  };
}
