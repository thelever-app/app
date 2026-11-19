import { describe, expect, it } from 'vitest';
import { minimumAgeIn, regionOf } from '../../vos/region.vo.ts';

describe('regionOf', () => {
  it('should place a country of the European Economic Area in the EEA', () => {
    // Act & Assert: one of the Union, and one of the area outside it.
    expect(regionOf('ES')).toBe('eea');
    expect(regionOf('NO')).toBe('eea');
  });

  it('should place any other country in the rest of the world', () => {
    // Act & Assert
    expect(regionOf('US')).toBe('rest-of-world');
    expect(regionOf('MX')).toBe('rest-of-world');
  });

  it('should block the sanctioned countries, Russia, China, Brazil and the United Kingdom', () => {
    // Act & Assert
    for (const country of ['RU', 'BY', 'KP', 'IR', 'SY', 'CN', 'BR', 'GB']) {
      expect(regionOf(country)).toBe('blocked');
    }
  });

  it('should read the code of a country in any case', () => {
    // Act & Assert
    expect(regionOf('gb')).toBe('blocked');
  });

  it('should take an address without a known country for the rest of the world', () => {
    // Act & Assert: the stricter minimum age applies.
    expect(regionOf(undefined)).toBe('rest-of-world');
  });
});

describe('minimumAgeIn', () => {
  it('should ask for 16 in the EEA and 18 in the rest of the world', () => {
    // Act & Assert
    expect(minimumAgeIn('eea')).toBe(16);
    expect(minimumAgeIn('rest-of-world')).toBe(18);
  });
});
