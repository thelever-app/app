import { describe, expect, it } from 'vitest';
import { RequestCodeVO } from '../../vos/request-code.vo.ts';
import { FixedRandomness } from '../support/fixed-randomness.ts';

describe('RequestCodeVO', () => {
  it('should generate 12 characters from the ones the randomness picks', () => {
    // Act
    const code = RequestCodeVO.generate(new FixedRandomness(0, 9, 10, 31, 20, 1, 2, 3, 4, 5, 6, 7));

    // Assert
    expect(code.value).toBe('09AZM1234567');
  });

  it('should be written in three groups of four', () => {
    // Arrange
    const code = RequestCodeVO.generate(new FixedRandomness(0, 9, 10, 31, 20, 1, 2, 3, 4, 5, 6, 7));

    // Act & Assert
    expect(code.toString()).toBe('09AZ-M123-4567');
  });

  it('should read a code however it is written: in small letters, with spaces or dashes', () => {
    // Act
    const code = RequestCodeVO.parse(' k7q4 md2x-9prt ');

    // Assert
    expect(code?.value).toBe('K7Q4MD2X9PRT');
  });

  it('should read O as 0 and I or L as 1, the characters people mix them up with', () => {
    // Act
    const code = RequestCodeVO.parse('K7Q4-MO2X-9IRL');

    // Assert
    expect(code?.value).toBe('K7Q4M02X91R1');
  });

  it.each(['K7Q4-MD2X-9PR', 'K7Q4-MD2X-9PRTA', 'K7Q4-MD2X-9PRU', 'K7Q4-MD2X-9PR#', ''])(
    'should read nothing in %j, which is not a code',
    (written) => {
      // Act & Assert
      expect(RequestCodeVO.parse(written)).toBeUndefined();
    },
  );
});
