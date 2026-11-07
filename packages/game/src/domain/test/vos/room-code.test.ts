import { describe, expect, it } from 'vitest';
import { RoomCodeVO } from '../../vos/room-code.vo.ts';
import { InvalidRoomCodeError } from '../../errors/invalid-room-code.error.ts';
import { FixedRandomness } from '../support/fixed-randomness.ts';

describe('RoomCodeVO', () => {
  it('should keep a code of 5 valid characters in capitals', () => {
    // Act
    const code = new RoomCodeVO(' k7m2q ');

    // Assert
    expect(code.value).toBe('K7M2Q');
  });

  it.each(['K7M2', 'K7M2QX'])(
    'should throw an error for %s, which does not have 5 characters',
    (value) => {
      // Act & Assert
      expect(() => new RoomCodeVO(value)).toThrow(InvalidRoomCodeError);
    },
  );

  it.each(['K7M20', 'K7MOQ', 'K7M1Q', 'K7MIQ', 'K7MLQ', 'K7M-Q'])(
    'should throw an error for %s, which has a character people mix up or that is not allowed',
    (value) => {
      // Act & Assert
      expect(() => new RoomCodeVO(value)).toThrow(InvalidRoomCodeError);
    },
  );

  it('should generate a code from the characters the randomness picks', () => {
    // Act
    const code = RoomCodeVO.generate(new FixedRandomness(0, 1, 2, 30, 23));

    // Assert
    expect(code.value).toBe('ABC92');
  });
});
