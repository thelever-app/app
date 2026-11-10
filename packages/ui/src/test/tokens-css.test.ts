import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { tokensCss, type DesignTokens } from '../tokens-css.ts';

const tokens = JSON.parse(
  readFileSync(new URL('../tokens.json', import.meta.url), 'utf8'),
) as DesignTokens;

describe('tokensCss', () => {
  it('should give every color its light value and opt out of the dark mode of the browser', () => {
    // Act
    const css = tokensCss(tokens);

    // Assert
    expect(css).toContain('color-scheme: only light;');
    expect(css).toContain('--color-bg: #fbf6ec;');
    expect(css).not.toContain('prefers-color-scheme');
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

  it('should turn the durations and the easing curves of motion into custom properties', () => {
    // Act
    const css = tokensCss(tokens);

    // Assert
    expect(css).toContain('--duration-fast: 120ms;');
    expect(css).toContain('--duration-slow: 320ms;');
    expect(css).toContain('--ease-enter: cubic-bezier(0.2, 0, 0, 1);');
  });

  it('should match the tokens.css in the repo, so nobody forgets to regenerate it', () => {
    // Arrange
    const committed = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8');

    // Act & Assert
    expect(committed).toBe(tokensCss(tokens));
  });
});
