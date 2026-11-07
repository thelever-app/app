import { describe, expect, it } from 'vitest';
import { relevanceOf } from '../../services/text-search.ts';

const TRAM = {
  text: 'Un tranvía sin frenos va hacia cinco personas',
  tags: ['familia', 'trabajo'],
};

describe('relevanceOf', () => {
  it('should match part of a word of the text, without minding case or accents', () => {
    // Act
    const found = ['TRANVIA', 'tranv', 'frEN', 'ía sin'].map((query) => relevanceOf(query, TRAM));

    // Assert
    expect(found.every((relevance) => relevance !== undefined)).toBe(true);
  });

  it('should match part of a tag', () => {
    // Act
    const relevance = relevanceOf('famil', TRAM);

    // Assert
    expect(relevance).toBeDefined();
  });

  it('should match only when every word searched is in the text or the tags', () => {
    // Act
    const both = relevanceOf('tranvía familia', TRAM);
    const one = relevanceOf('tranvía amistad', TRAM);

    // Assert
    expect(both).toBeDefined();
    expect(one).toBeUndefined();
  });

  it('should rank a whole tag first, then the start of a word, then anywhere else', () => {
    // Act
    const tag = relevanceOf('Familia', TRAM)!;
    const start = relevanceOf('tran', TRAM)!;
    const inside = relevanceOf('nvía', TRAM)!;

    // Assert
    expect(tag).toBeLessThan(start);
    expect(start).toBeLessThan(inside);
  });

  it('should match everything when nothing is searched', () => {
    // Act
    const relevance = relevanceOf('   ', TRAM);

    // Assert
    expect(relevance).toBeDefined();
  });
});
