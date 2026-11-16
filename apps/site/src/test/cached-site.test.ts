import { describe, expect, it, vi } from 'vitest';
import { InMemorySiteFiles } from '../files/in-memory-site-files.ts';
import { MANIFEST_FILE } from '../files/publish-site.ts';
import { cachedSite } from '../serve/cached-site.ts';

const MANIFEST = JSON.stringify({ pages: {}, dilemmas: {}, withdrawn: {} });

describe('cachedSite', () => {
  it('should read the manifest again only once it is older than its time to live', async () => {
    // Arrange
    const files = new InMemorySiteFiles();
    await files.put(MANIFEST_FILE, MANIFEST);
    const get = vi.spyOn(files, 'get');
    let now = 0;
    const site = cachedSite(files, 1000, () => now);

    // Act
    await site.current();
    now = 500;
    await site.current();
    now = 1000;
    await site.current();

    // Assert
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('should read it again when asked for one newer than it, before its time to live', async () => {
    // Arrange
    const files = new InMemorySiteFiles();
    await files.put(MANIFEST_FILE, MANIFEST);
    const get = vi.spyOn(files, 'get');
    let now = 0;
    const site = cachedSite(files, 60_000, () => now);
    await site.current();

    // Act
    now = 20_000;
    await site.newerThan(10_000);

    // Assert
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('should keep the site it had when reading it again fails', async () => {
    // Arrange
    const files = new InMemorySiteFiles();
    await files.put(MANIFEST_FILE, MANIFEST);
    let now = 0;
    const site = cachedSite(files, 1000, () => now);
    const before = await site.current();
    vi.spyOn(files, 'get').mockRejectedValue(new Error('TestStorageDown'));

    // Act
    now = 2000;
    const after = await site.current();

    // Assert
    expect(after).toBe(before);
  });

  it('should read it once for the requests that find it old at the same time', async () => {
    // Arrange
    const files = new InMemorySiteFiles();
    await files.put(MANIFEST_FILE, MANIFEST);
    const get = vi.spyOn(files, 'get');
    const site = cachedSite(files, 1000, () => 0);

    // Act
    await Promise.all([site.current(), site.current(), site.current()]);

    // Assert
    expect(get).toHaveBeenCalledTimes(1);
  });
});
