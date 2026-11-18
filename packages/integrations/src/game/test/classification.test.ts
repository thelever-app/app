import { DILEMMA_TYPES as DILEMMAS_TYPES, SCALES as DILEMMAS_SCALES } from '@thelever-app/dilemmas';
import { DILEMMA_TYPES as GAME_TYPES, SCALES as GAME_SCALES } from '@thelever-app/game';
import { describe, expect, it } from 'vitest';

describe('the classification of Game', () => {
  it('should have the types of dilemma Dilemmas gives its dilemmas, in the same order', () => {
    // Assert
    expect(GAME_TYPES).toEqual(DILEMMAS_TYPES);
  });

  it('should have the scales Dilemmas gives its dilemmas, in the same order', () => {
    // Assert
    expect(GAME_SCALES).toEqual(DILEMMAS_SCALES);
  });
});
