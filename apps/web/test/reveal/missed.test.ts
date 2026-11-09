import { describe, expect, it } from 'vitest';
import { missedOf } from '../../src/reveal/missed.ts';

describe('missedOf', () => {
  it.each([
    [[], { key: 'none' }],
    [['Sara'], { key: 'one', name: 'Sara' }],
    [['Luis', 'Sara'], { key: 'some', names: ['Luis', 'Sara'] }],
    [['Luis', 'Sara', 'Iris'], { key: 'some', names: ['Luis', 'Sara', 'Iris'] }],
    [['Luis', 'Sara', 'Iris', 'Leo'], { key: 'many', names: ['Luis', 'Sara'], more: 2 }],
  ])('should name the players missed %j, and count those beyond three', (missed, expected) => {
    // Act & Assert
    expect(missedOf(missed)).toEqual(expected);
  });
});
