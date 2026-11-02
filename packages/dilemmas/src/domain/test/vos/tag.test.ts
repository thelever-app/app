import { describe, expect, it } from 'vitest';
import { TagVO } from '../../vos/tag.vo.ts';
import { TagMissingError } from '../../errors/tag-missing.error.ts';
import { TagTooLongError } from '../../errors/tag-too-long.error.ts';

describe('TagVO', () => {
  describe('constructor', () => {
    it('should keep the tag in lowercase and without surrounding whitespace', () => {
      // Act
      const tag = new TagVO('  Familia ');

      // Assert
      expect(tag.value).toBe('familia');
    });

    it('should accept a tag of 30 characters', () => {
      // Act & Assert
      expect(new TagVO('a'.repeat(30)).value).toHaveLength(30);
    });

    it('should throw an error if the tag is longer than 30 characters', () => {
      // Act & Assert
      expect(() => new TagVO('a'.repeat(31))).toThrow(TagTooLongError);
    });

    it('should throw an error if the tag is only whitespace', () => {
      // Act & Assert
      expect(() => new TagVO('   ')).toThrow(TagMissingError);
    });
  });
});
