import { describe, expect, it } from 'vitest';
import { peopleInTheGap } from '../../services/people-in-the-gap.ts';
import { SequentialRandomness } from '../../../adapters/in-memory/sequential-randomness.ts';
import { KeepOrderRandomness } from '../support/keep-order-randomness.ts';

function players(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `TestPlayer${index + 1}`);
}

describe('peopleInTheGap', () => {
  it('should not choose anyone twice while others are left', () => {
    // Act
    const chosen = peopleInTheGap(
      ['TestD1', 'TestD2', 'TestD3'],
      players(3),
      new SequentialRandomness(),
    );

    // Assert
    expect(new Set(chosen.values()).size).toBe(3);
  });

  it('should choose among everyone again once all have been chosen', () => {
    // Act
    const chosen = peopleInTheGap(
      ['TestD1', 'TestD2', 'TestD3'],
      players(2),
      new KeepOrderRandomness(),
    );

    // Assert
    expect([...chosen.values()]).toEqual(['TestPlayer2', 'TestPlayer1', 'TestPlayer2']);
  });
});
