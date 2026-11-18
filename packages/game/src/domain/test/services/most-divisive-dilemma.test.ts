import { describe, expect, it } from 'vitest';
import { mostDivisiveDilemma } from '../../services/most-divisive-dilemma.ts';

function voted(dilemmaId: string, ...counts: number[]) {
  return {
    dilemmaId,
    distribution: counts.map((count, index) => ({ optionId: `TestOption${index}`, count })),
  };
}

describe('mostDivisiveDilemma', () => {
  it('should pick the dilemma closest to an even split among its options', () => {
    // Act
    const dilemmaId = mostDivisiveDilemma([
      voted('TestFirst', 3, 0),
      voted('TestSecond', 3, 0),
      voted('TestThird', 2, 1),
    ]);

    // Assert
    expect(dilemmaId).toBe('TestThird');
  });

  it('should pick the first one on a tie', () => {
    // Act
    const dilemmaId = mostDivisiveDilemma([
      voted('TestFirst', 3, 0),
      voted('TestSecond', 2, 1),
      voted('TestFifth', 1, 2),
    ]);

    // Assert
    expect(dilemmaId).toBe('TestSecond');
  });

  it('should compare dilemmas with a different number of options by how far each share is from an even one', () => {
    // Act
    const dilemmaId = mostDivisiveDilemma([voted('TestTwo', 3, 1), voted('TestThree', 1, 1, 1)]);

    // Assert
    expect(dilemmaId).toBe('TestThree');
  });

  it('should leave out the dilemmas with fewer than 3 votes, and give none without any left', () => {
    // Act
    const some = mostDivisiveDilemma([voted('TestFew', 1, 1), voted('TestMany', 3, 0)]);
    const none = mostDivisiveDilemma([
      voted('TestFew', 1, 1),
      { dilemmaId: 'TestHidden', distribution: null },
    ]);

    // Assert
    expect(some).toBe('TestMany');
    expect(none).toBeNull();
  });
});
