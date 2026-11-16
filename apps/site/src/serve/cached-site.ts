import { publishedSite } from '../files/publish-site.ts';
import type { SiteFiles } from '../files/site-files.port.ts';
import type { PublishedSite } from '../respond.ts';

/**
 * The published site, reading its manifest again once it is older than `ttlMs`: a new generation
 * reaches every instance within that time.
 */
export function cachedSite(
  files: SiteFiles,
  ttlMs: number,
  now: () => number = Date.now,
): () => Promise<PublishedSite | undefined> {
  let cached: { readonly site: PublishedSite | undefined; readonly at: number } | undefined;
  return async () => {
    if (!cached || now() - cached.at >= ttlMs) {
      cached = { site: await publishedSite(files), at: now() };
    }
    return cached.site;
  };
}
