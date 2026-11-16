import type { BuiltSite, SiteManifest } from '../build-site.ts';
import type { PublishedSite } from '../respond.ts';
import { md5Of } from './in-memory-site-files.ts';
import type { SiteFiles } from './site-files.port.ts';

export const MANIFEST_FILE = 'manifest.json';

/** How many files it writes at once. */
const CONCURRENCY = 16;

export interface PublishOutput {
  readonly written: number;
  readonly removed: number;
}

/**
 * Writes the files of the site that changed, then the manifest, which the service reads first, and
 * last removes the files neither this site nor the one before uses: an instance may still answer
 * with the manifest before for a few minutes, and its pages must be there until the next run.
 */
export async function publishSite(site: BuiltSite, files: SiteFiles): Promise<PublishOutput> {
  const kept = await files.list();
  const before = await publishedSite(files);
  const usedBefore = new Set(Object.values(before?.manifest.pages ?? {}).map(({ file }) => file));
  const changed = [...site.files].filter(([name, { body }]) => kept.get(name) !== md5Of(body));
  await inBatches(changed, ([name, { body, contentType }]) => files.put(name, body, contentType));
  await files.put(MANIFEST_FILE, JSON.stringify(site.manifest), 'application/json');
  const stale = [...kept.keys()].filter(
    (name) => name !== MANIFEST_FILE && !site.files.has(name) && !usedBefore.has(name),
  );
  await inBatches(stale, (name) => files.remove(name));
  return { written: changed.length, removed: stale.length };
}

/** The site as it was last published, or none if it never was. */
export async function publishedSite(files: SiteFiles): Promise<PublishedSite | undefined> {
  const manifest = await files.get(MANIFEST_FILE);
  if (manifest === undefined) return undefined;
  return { manifest: JSON.parse(manifest) as SiteManifest, read: (file) => files.get(file) };
}

async function inBatches<T>(items: readonly T[], each: (item: T) => Promise<void>): Promise<void> {
  for (let start = 0; start < items.length; start += CONCURRENCY) {
    await Promise.all(items.slice(start, start + CONCURRENCY).map(each));
  }
}
