import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const BRAND = join(import.meta.dirname, '../../src/assets/brand');
const drawings = readdirSync(BRAND).filter((name) => name.endsWith('.svg'));

describe('the drawings of the brand', () => {
  it.each(drawings)('should be an SVG the browser can draw: %s', (name) => {
    // Arrange
    const source = readFileSync(join(BRAND, name), 'utf8');

    // Act
    const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');

    // Assert
    expect(parsed.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(parsed.documentElement.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
  });
});
