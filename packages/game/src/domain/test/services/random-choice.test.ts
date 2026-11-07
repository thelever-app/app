import { describe, expect, it } from 'vitest';
import { pickOne, shuffle } from '../../services/random-choice.ts';
import { FixedRandomness } from '../support/fixed-randomness.ts';

describe('pickOne', () => {
  it('should pick the item at the position the randomness gives', () => {
    // Act
    const picked = pickOne(['a', 'b', 'c'], new FixedRandomness(2));

    // Assert
    expect(picked).toBe('c');
  });

  it('should throw an error if there is nothing to pick from', () => {
    // Act & Assert
    expect(() => pickOne([], new FixedRandomness())).toThrow();
  });
});

describe('shuffle', () => {
  it('should keep every item once', () => {
    // Act
    const shuffled = shuffle(['a', 'b', 'c', 'd'], new FixedRandomness(1, 0, 1));

    // Assert
    expect([...shuffled].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('should swap each item, from the last, with the one the randomness gives', () => {
    // Arrange: d swaps with b, then c with a, then d (now second) stays where it is.
    const randomness = new FixedRandomness(1, 0, 1);

    // Act
    const shuffled = shuffle(['a', 'b', 'c', 'd'], randomness);

    // Assert
    expect(shuffled).toEqual(['c', 'd', 'a', 'b']);
  });

  it('should not change the items it is given', () => {
    // Arrange
    const items = ['a', 'b', 'c'];

    // Act
    shuffle(items, new FixedRandomness(0, 0));

    // Assert
    expect(items).toEqual(['a', 'b', 'c']);
  });
});
