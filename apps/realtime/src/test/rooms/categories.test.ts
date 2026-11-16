import { CATEGORIES } from '@thelever-app/game';
import { CategoryDto } from '@thelever-app/protocol';
import { describe, expect, it } from 'vitest';

describe('the categories of the protocol', () => {
  it('should be the ones a room plays, in the order the screens offer them', () => {
    // Assert
    expect(CategoryDto.options).toEqual(CATEGORIES);
  });
});
