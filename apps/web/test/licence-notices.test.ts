import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { licenceTextIn, noticesOf } from '../licence-notices.ts';

describe('noticesOf', () => {
  it('should give each version of each package its licence and the text it ships, by name', () => {
    // Arrange
    const listing = {
      MIT: [
        { name: 'test-zeta', versions: ['1.0.0'], paths: ['/test/zeta'], license: 'MIT' },
        {
          name: 'test-alpha',
          versions: ['1.0.0', '2.0.0'],
          paths: ['/test/alpha-1', '/test/alpha-2'],
          license: 'MIT',
        },
      ],
      'Apache-2.0': [
        { name: 'test-icons', versions: ['0.1.0'], paths: ['/test/icons'], license: 'Apache-2.0' },
      ],
    };
    const texts: Record<string, string> = {
      '/test/zeta': 'TestZetaLicence',
      '/test/alpha-1': 'TestAlphaLicence1',
      '/test/alpha-2': 'TestAlphaLicence2',
    };

    // Act
    const notices = noticesOf(listing, (dir) => texts[dir] ?? null);

    // Assert
    expect(notices).toEqual([
      { name: 'test-alpha', version: '1.0.0', licence: 'MIT', text: 'TestAlphaLicence1' },
      { name: 'test-alpha', version: '2.0.0', licence: 'MIT', text: 'TestAlphaLicence2' },
      { name: 'test-icons', version: '0.1.0', licence: 'Apache-2.0', text: null },
      { name: 'test-zeta', version: '1.0.0', licence: 'MIT', text: 'TestZetaLicence' },
    ]);
  });
});

describe('licenceTextIn', () => {
  it('should read the licence and the notice a package ships, whatever their spelling', () => {
    // Arrange
    const dir = mkdtempSync(path.join(tmpdir(), 'licence-'));
    writeFileSync(path.join(dir, 'LICENSE.md'), 'TestLicence\n');
    writeFileSync(path.join(dir, 'NOTICE'), 'TestNotice\n');
    writeFileSync(path.join(dir, 'README.md'), 'TestReadme');

    // Act & Assert
    expect(licenceTextIn(dir)).toBe('TestLicence\n\nTestNotice');
  });

  it('should give no text for a package that ships none', () => {
    // Arrange
    const dir = mkdtempSync(path.join(tmpdir(), 'licence-'));

    // Act & Assert
    expect(licenceTextIn(dir)).toBeNull();
  });
});
