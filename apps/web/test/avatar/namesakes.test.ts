import { describe, expect, it } from 'vitest';
import { namesakesOf, sameNickname } from '../../src/avatar/namesakes.ts';

describe('sameNickname', () => {
  it.each([
    ['Ana', 'Ana'],
    ['Ana', 'ana'],
    ['Ana', 'Aná'],
    ['José', 'JOSE'],
    ['Ana', '  ana '],
  ])('should take %s and %s for the same nickname, as the room does', (one, other) => {
    // Act & Assert
    expect(sameNickname(one, other)).toBe(true);
  });

  it.each([
    ['Ana', 'Anna'],
    ['Ana', 'Ana María'],
    ['Luis', 'Lu'],
  ])('should tell %s from %s', (one, other) => {
    // Act & Assert
    expect(sameNickname(one, other)).toBe(false);
  });
});

describe('namesakesOf', () => {
  const players = [{ nickname: 'Ana' }, { nickname: 'Luis' }, { nickname: 'aná' }];

  it('should find every player with the same nickname', () => {
    // Act & Assert
    expect(namesakesOf('ANA', players)).toEqual([{ nickname: 'Ana' }, { nickname: 'aná' }]);
  });

  it('should find nobody for a blank nickname', () => {
    // Act & Assert
    expect(namesakesOf('  ', players)).toEqual([]);
  });
});
