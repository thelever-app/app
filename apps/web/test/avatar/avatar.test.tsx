import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar, faceUri } from '../../src/avatar/avatar.tsx';
import { FACE_IDS } from '../../src/avatar/faces.ts';

/** The SVG behind a data URI that DiceBear encodes. */
function svgOf(uri: string): string {
  return decodeURIComponent(uri.replace(/^data:image\/svg\+xml;charset=utf-8,/, ''));
}

describe('faceUri', () => {
  it('should draw twelve different faces', () => {
    // Act
    const faces = new Set(FACE_IDS.map(faceUri));

    // Assert
    expect(faces.size).toBe(12);
  });

  it('should leave the background clear, for the colour of the player to show', () => {
    // Act
    const svg = svgOf(faceUri('face-01'));

    // Assert
    expect(svg).toContain('<svg');
    expect(svg).not.toMatch(/<rect fill="#ffffff"/);
  });
});

describe('Avatar', () => {
  it('should draw the face on the colour of the player, and dim it while disconnected', () => {
    // Act
    const { container } = render(<Avatar avatar={{ face: 'face-02', color: 'rust' }} dimmed />);

    // Assert
    const avatar = container.firstElementChild as HTMLElement;
    expect(avatar.style.getPropertyValue('--avatar-color')).toBe('var(--color-player-rust)');
    expect(avatar.dataset.dimmed).toBe('true');
    expect(avatar.querySelector('img')?.getAttribute('alt')).toBe('');
  });
});
