import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const WEB = join(import.meta.dirname, '../..');
const PUBLIC = join(WEB, 'public');

interface ManifestIcon {
  readonly src: string;
  readonly sizes: string;
  readonly type: string;
  readonly purpose?: string;
}

function manifest(): Record<string, unknown> & { readonly icons: readonly ManifestIcon[] } {
  return JSON.parse(readFileSync(join(PUBLIC, 'manifest.webmanifest'), 'utf8'));
}

/** The width and height a PNG declares in its header. */
function pngSize(path: string): string {
  const png = readFileSync(path);
  return `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
}

function page(): Document {
  return new DOMParser().parseFromString(
    readFileSync(join(WEB, 'index.html'), 'utf8'),
    'text/html',
  );
}

describe('the manifest of the app', () => {
  it('should open the start of the app on its own, as an app', () => {
    // Act
    const { start_url, scope, display, name, short_name } = manifest();

    // Assert
    expect({ start_url, scope, display, name, short_name }).toEqual({
      start_url: '/app',
      scope: '/',
      display: 'standalone',
      name: 'TheLever',
      short_name: 'TheLever',
    });
  });

  it('should take the colours of the brand', () => {
    // Act
    const { theme_color, background_color } = manifest();

    // Assert
    expect({ theme_color, background_color }).toEqual({
      theme_color: '#ffd23f',
      background_color: '#fbf6ec',
    });
  });

  it('should offer the icons a browser needs to install it, also to crop them', () => {
    // Act
    const { icons } = manifest();

    // Assert
    expect(icons.map(({ sizes, purpose }) => `${sizes} ${purpose ?? 'any'}`)).toEqual(
      expect.arrayContaining(['192x192 any', '512x512 any', '512x512 maskable']),
    );
  });

  it.each(manifest().icons)('should have each icon at its size: $src $purpose', (icon) => {
    // Arrange
    const file = join(PUBLIC, icon.src);

    // Act
    const size = existsSync(file) ? pngSize(file) : 'missing';

    // Assert
    expect(icon.type).toBe('image/png');
    expect(size).toBe(icon.sizes);
  });
});

describe('the page of the app', () => {
  it('should link the manifest', () => {
    // Act
    const link = page().querySelector('link[rel="manifest"]');

    // Assert
    expect(link?.getAttribute('href')).toBe('/manifest.webmanifest');
  });

  it('should give iOS the icon for the home screen', () => {
    // Act
    const href = page().querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href');

    // Assert
    expect(href).toBe('/icons/apple-touch-icon.png');
    expect(pngSize(join(PUBLIC, href as string))).toBe('180x180');
  });

  it('should show the icon of the app in the tab', () => {
    // Act
    const href = page().querySelector('link[rel="icon"]')?.getAttribute('href');

    // Assert
    expect(href).toBe('/src/assets/brand/icon.svg');
  });
});
