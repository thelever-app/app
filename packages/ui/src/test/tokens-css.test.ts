import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { tokensCss, type DesignTokens } from '../tokens-css.ts';

const tokens = JSON.parse(
  readFileSync(new URL('../tokens.json', import.meta.url), 'utf8'),
) as DesignTokens;

describe('tokensCss', () => {
  it('should give every color its light value by default and its dark value in dark mode', () => {
    // Act
    const css = tokensCss(tokens);

    // Assert
    const [light, dark] = css.split('@media (prefers-color-scheme: dark)');
    expect(light).toContain('--color-bg: #fbf6ec;');
    expect(dark).toContain('--color-bg: #15130e;');
  });

  it('should turn every text style into its family, size, line height, weight and spacing', () => {
    // Act
    const css = tokensCss(tokens);

    // Assert
    expect(css).toContain('--type-signage-family: var(--font-text);');
    expect(css).toContain('--type-signage-size: 12px;');
    expect(css).toContain('--type-signage-letter-spacing: 0.08em;');
    expect(css).toContain('--type-title-family: var(--font-display);');
  });

  it('should turn spacing and radius into lengths', () => {
    // Act
    const css = tokensCss(tokens);

    // Assert
    expect(css).toContain('--space-4: 16px;');
    expect(css).toContain('--radius-md: 12px;');
  });

  it('should match the tokens.css in the repo, so nobody forgets to regenerate it', () => {
    // Arrange
    const committed = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8');

    // Act & Assert
    expect(committed).toBe(tokensCss(tokens));
  });
});
