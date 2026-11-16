import { describe, expect, it } from 'vitest';
import type { BuiltSite } from '../build-site.ts';
import { InMemorySiteFiles } from '../files/in-memory-site-files.ts';
import { MANIFEST_FILE, publishedSite, publishSite } from '../files/publish-site.ts';

function siteWith(files: Record<string, string>): BuiltSite {
  return {
    files: new Map(
      Object.entries(files).map(([name, body]) => [name, { body, contentType: 'text/html' }]),
    ),
    manifest: { pages: {}, dilemmas: {}, withdrawn: {} },
    pages: [],
  };
}

describe('publishSite', () => {
  it('should write only the files that changed, and remove those no longer in the site', async () => {
    // Arrange
    const files = new InMemorySiteFiles();
    await publishSite(siteWith({ 'a.html': 'TestA', 'b.html': 'TestB' }), files);

    // Act
    const output = await publishSite(siteWith({ 'a.html': 'TestA', 'c.html': 'TestC' }), files);

    // Assert
    expect(output).toEqual({ written: 1, removed: 1 });
    expect(await files.get('b.html')).toBeUndefined();
    expect(await files.get('c.html')).toBe('TestC');
    expect(await files.get(MANIFEST_FILE)).toBeDefined();
  });
});

describe('publishSite and the site before', () => {
  it('should keep the pages of the site before until the next run, for instances that still read it', async () => {
    // Arrange
    const files = new InMemorySiteFiles();
    const withPage = (file: string, body: string): BuiltSite => ({
      ...siteWith({ [file]: body }),
      manifest: { pages: { [`/${file}`]: { file, indexable: true } }, dilemmas: {}, withdrawn: {} },
    });
    await publishSite(withPage('old.html', 'TestOld'), files);

    // Act
    await publishSite(withPage('new.html', 'TestNew'), files);
    const afterOne = await files.get('old.html');
    await publishSite(withPage('new.html', 'TestNew'), files);

    // Assert
    expect(afterOne).toBe('TestOld');
    expect(await files.get('old.html')).toBeUndefined();
  });
});

describe('publishedSite', () => {
  it('should read the site as it was published, and nothing before it ever was', async () => {
    // Arrange
    const files = new InMemorySiteFiles();
    const before = await publishedSite(files);
    await publishSite(siteWith({ 'a.html': 'TestA' }), files);

    // Act
    const site = await publishedSite(files);

    // Assert
    expect(before).toBeUndefined();
    expect(site?.manifest).toEqual({ pages: {}, dilemmas: {}, withdrawn: {} });
    expect(await site?.read('a.html')).toBe('TestA');
  });
});
