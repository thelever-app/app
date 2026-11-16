import { CATEGORIES as DILEMMA_CATEGORIES } from '@thelever-app/dilemmas';
import { CATEGORIES as ROOM_CATEGORIES } from '@thelever-app/game';
import { describe, expect, it } from 'vitest';

describe('the categories of Game', () => {
  it('should be the ones Dilemmas gives its dilemmas, in the same order', () => {
    // Assert
    expect(ROOM_CATEGORIES).toEqual(DILEMMA_CATEGORIES);
  });
});
