import { describe, expect, it } from 'vitest';
import { HttpErrorDto } from '../../http/http-error.ts';

describe('HttpErrorDto', () => {
  it('should carry a known code and no text for the screen', () => {
    // Act & Assert
    expect(HttpErrorDto.parse({ code: 'room-not-found' })).toEqual({ code: 'room-not-found' });
    expect(HttpErrorDto.safeParse({ code: 'room-not-found', message: 'No room' }).success).toBe(
      false,
    );
    expect(HttpErrorDto.safeParse({ code: 'not-a-code' }).success).toBe(false);
  });
});
