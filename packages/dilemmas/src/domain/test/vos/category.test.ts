import { describe, expect, it } from 'vitest';
import { CATEGORIES, CategoryVO } from '../../vos/category.vo.ts';
import { UnknownCategoryError } from '../../errors/unknown-category.error.ts';

describe('CategoryVO', () => {
  describe('constructor', () => {
    it('should accept every category of the list', () => {
      // Act & Assert
      for (const category of CATEGORIES) {
        expect(new CategoryVO(category).value).toBe(category);
      }
    });

    it('should throw an error if the category is not in the list', () => {
      // Act & Assert
      expect(() => new CategoryVO('family')).toThrow(UnknownCategoryError);
    });
  });
});
