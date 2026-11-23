import { describe, expect, it } from 'vitest';
import { visitOriginOf } from '../../vos/visit-origin.vo.ts';

describe('visitOriginOf', () => {
  it('should keep the four parameters of the link', () => {
    // Act
    const origin = visitOriginOf({
      source: 'cartel',
      campaign: 'bares',
      content: 'tinder',
      ref: 'ana',
    });

    // Assert
    expect(origin).toEqual({ source: 'cartel', campaign: 'bares', content: 'tinder', ref: 'ana' });
  });

  it('should keep nothing of a parameter that is missing or empty', () => {
    // Act
    const origin = visitOriginOf({ source: 'cartel', campaign: '  ' });

    // Assert
    expect(origin).toEqual({ source: 'cartel', campaign: null, content: null, ref: null });
  });

  it('should keep only small letters, digits, dots, dashes and underscores, cut short', () => {
    // Act
    const origin = visitOriginOf({ source: ' Cartel <b>Bar</b> ', content: 'x'.repeat(100) });

    // Assert
    expect(origin.source).toBe('cartelbbarb');
    expect(origin.content).toHaveLength(64);
  });
});
