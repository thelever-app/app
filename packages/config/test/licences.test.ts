import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { notAllowed, productionLicences, type LicenceListing } from '../licences.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** Test data: a dependency under that licence. */
function underLicence(license: string, name = `test-${license}`) {
  return { name, versions: ['1.0.0'], paths: [`/test/${name}`], license };
}

describe('notAllowed', () => {
  it('should let in the licences compatible with the AGPL-3.0', () => {
    // Arrange
    const listing: LicenceListing = {
      MIT: [underLicence('MIT')],
      'Apache-2.0': [underLicence('Apache-2.0')],
      'OFL-1.1': [underLicence('OFL-1.1')],
      BSD: [underLicence('BSD')],
    };

    // Act & Assert
    expect(notAllowed(listing)).toEqual([]);
  });

  it('should name each dependency under any other licence, or under none', () => {
    // Arrange
    const listing: LicenceListing = {
      MIT: [underLicence('MIT')],
      'GPL-2.0-only': [underLicence('GPL-2.0-only', 'test-gpl')],
      Unknown: [underLicence('Unknown', 'test-unknown')],
      'CC-BY-NC-4.0': [underLicence('CC-BY-NC-4.0', 'test-non-commercial')],
    };

    // Act & Assert
    expect(notAllowed(listing)).toEqual([
      'test-gpl (GPL-2.0-only)',
      'test-non-commercial (CC-BY-NC-4.0)',
      'test-unknown (Unknown)',
    ]);
  });
});

describe('the workspace', () => {
  it('should depend in production only on licences compatible with the AGPL-3.0', () => {
    // Act
    const outside = notAllowed(productionLicences(ROOT, true));

    // Assert
    expect(outside).toEqual([]);
  });
});
