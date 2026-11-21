import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { canonicalTextOf, licenceTextIn, noticesOf } from '../licence-notices.ts';

describe('noticesOf', () => {
  it('should give each version of each package its licence, its author and the text it ships, by name', () => {
    // Arrange
    const listing = {
      MIT: [
        { name: 'test-zeta', versions: ['1.0.0'], paths: ['/test/zeta'], license: 'MIT' },
        {
          name: 'test-alpha',
          versions: ['1.0.0', '2.0.0'],
          paths: ['/test/alpha-1', '/test/alpha-2'],
          license: 'MIT',
          author: 'TestAuthor',
        },
      ],
    };
    const texts: Record<string, string> = {
      '/test/zeta': 'TestZetaLicence',
      '/test/alpha-1': 'TestAlphaLicence1',
      '/test/alpha-2': 'TestAlphaLicence2',
    };

    // Act
    const { notices, licences } = noticesOf(
      listing,
      (dir) => texts[dir] ?? null,
      () => null,
    );

    // Assert
    expect(notices).toEqual([
      {
        name: 'test-alpha',
        version: '1.0.0',
        licence: 'MIT',
        author: 'TestAuthor',
        text: 'TestAlphaLicence1',
      },
      {
        name: 'test-alpha',
        version: '2.0.0',
        licence: 'MIT',
        author: 'TestAuthor',
        text: 'TestAlphaLicence2',
      },
      {
        name: 'test-zeta',
        version: '1.0.0',
        licence: 'MIT',
        author: null,
        text: 'TestZetaLicence',
      },
    ]);
    expect(licences).toEqual({});
  });

  it('should give once the canonical text of each licence a package ships no text of', () => {
    // Arrange
    const listing = {
      'Apache-2.0': [
        { name: 'test-icons', versions: ['0.1.0'], paths: ['/test/icons'], license: 'Apache-2.0' },
        { name: 'test-sdk', versions: ['2.0.0'], paths: ['/test/sdk'], license: 'Apache-2.0' },
      ],
    };

    // Act
    const { notices, licences } = noticesOf(
      listing,
      () => null,
      (licence) => `TestCanonical ${licence}`,
    );

    // Assert
    expect(notices.map(({ text }) => text)).toEqual([null, null]);
    expect(licences).toEqual({ 'Apache-2.0': 'TestCanonical Apache-2.0' });
  });

  it('should stop the build when a package ships no text and the licence has no canonical one', () => {
    // Arrange
    const listing = {
      'BlueOak-1.0.0': [
        {
          name: 'test-cache',
          versions: ['1.0.0'],
          paths: ['/test/cache'],
          license: 'BlueOak-1.0.0',
        },
      ],
    };

    // Act & Assert
    expect(() =>
      noticesOf(
        listing,
        () => null,
        () => null,
      ),
    ).toThrow(/BlueOak-1\.0\.0/);
  });
});

describe('licenceTextIn', () => {
  const dirs: string[] = [];
  const newDir = () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'licence-'));
    dirs.push(dir);
    return dir;
  };

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true });
  });

  it('should read the licence and the notice a package ships, whatever their spelling', () => {
    // Arrange
    const dir = newDir();
    writeFileSync(path.join(dir, 'LICENSE.md'), 'TestLicence\n');
    writeFileSync(path.join(dir, 'NOTICE'), 'TestNotice\n');
    writeFileSync(path.join(dir, 'README.md'), 'TestReadme');

    // Act & Assert
    expect(licenceTextIn(dir)).toBe('TestLicence\n\nTestNotice');
  });

  it('should give no text for a package that ships none', () => {
    // Act & Assert
    expect(licenceTextIn(newDir())).toBeNull();
  });
});

describe('canonicalTextOf', () => {
  it('should have the canonical text of the licences some dependencies of the web ship without', () => {
    // Act & Assert
    expect(canonicalTextOf('Apache-2.0')).toContain('Apache License');
    expect(canonicalTextOf('MIT')).toContain('Permission is hereby granted');
  });
});
