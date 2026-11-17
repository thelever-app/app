import { describe, expect, it } from 'vitest';
import { SCALES, ScaleVO } from '../../vos/scale.vo.ts';
import { UnknownScaleError } from '../../errors/unknown-scale.error.ts';

describe('ScaleVO', () => {
  describe('constructor', () => {
    it('should accept the everyday, medium and extreme scales', () => {
      // Act & Assert
      expect(SCALES).toEqual(['everyday', 'medium', 'extreme']);
      for (const scale of SCALES) {
        expect(new ScaleVO(scale).value).toBe(scale);
      }
    });

    it('should throw an error if the scale is not in the list', () => {
      // Act & Assert
      expect(() => new ScaleVO('extremo')).toThrow(UnknownScaleError);
    });
  });
});
