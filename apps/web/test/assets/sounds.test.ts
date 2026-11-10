import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOUNDS = join(import.meta.dirname, '../../src/assets/sounds');

/** Only licences that need no attribution on screen. */
const ALLOWED_LICENCES = ['CC0-1.0'];

interface Licence {
  readonly source: string;
  readonly url: string;
  readonly license: string;
}

const registry = JSON.parse(readFileSync(join(SOUNDS, 'licenses.json'), 'utf8')) as Record<
  string,
  Licence
>;
const files = readdirSync(SOUNDS).filter((name) => name !== 'licenses.json');

describe('the sound files', () => {
  it.each(files)('should say where %s comes from, under a licence we may use', (name) => {
    // Act
    const licence = registry[name];

    // Assert
    expect(licence?.source).toBeTruthy();
    expect(licence?.url).toMatch(/^https:\/\//);
    expect(ALLOWED_LICENCES).toContain(licence?.license);
  });

  it('should register only files that exist', () => {
    // Assert
    expect(Object.keys(registry).sort()).toEqual([...files].sort());
  });
});
