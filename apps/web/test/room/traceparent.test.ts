import { TraceparentDto } from '@thelever-app/protocol';
import { describe, expect, it } from 'vitest';
import { newTraceparent } from '../../src/room/traceparent.ts';

describe('newTraceparent', () => {
  it('should make a trace context the room server accepts', () => {
    // Act
    const traceparent = newTraceparent();

    // Assert
    expect(TraceparentDto.safeParse(traceparent).success).toBe(true);
  });

  it('should start a different trace every time', () => {
    // Act
    const traceparents = new Set(Array.from({ length: 100 }, () => newTraceparent()));

    // Assert
    expect(traceparents.size).toBe(100);
  });
});
