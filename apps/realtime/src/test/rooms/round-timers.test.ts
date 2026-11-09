import { ConsoleLogger } from '@thelever-app/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyedLock } from '../../concurrency/keyed-lock.ts';
import { TotalTimeTimers } from '../../rooms/total-time-timers.ts';

/** Records each room it ran out, as the use case would. */
function arrange() {
  const ranOut: string[] = [];
  const timers = new TotalTimeTimers(
    async (roomId) => {
      ranOut.push(roomId);
    },
    new KeyedLock(),
    (command) => command(),
    new ConsoleLogger(),
  );
  return { timers, ranOut };
}

describe('TotalTimeTimers', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-09T10:00:00Z') });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should run out the total time of a room when it ends, once', async () => {
    // Arrange
    const { timers, ranOut } = arrange();

    // Act
    timers.schedule('TestRoomId', new Date('2026-11-09T10:06:00Z'));
    timers.schedule('TestRoomId', new Date('2026-11-09T10:06:00Z'));
    await vi.advanceTimersByTimeAsync(6 * 60_000 - 1);
    const before = [...ranOut];
    await vi.advanceTimersByTimeAsync(1);

    // Assert
    expect(before).toEqual([]);
    expect(ranOut).toEqual(['TestRoomId']);
  });

  it('should run it out at once when the time is already over', async () => {
    // Arrange
    const { timers, ranOut } = arrange();

    // Act
    timers.schedule('TestRoomId', new Date('2026-11-09T09:00:00Z'));
    await vi.advanceTimersByTimeAsync(0);

    // Assert
    expect(ranOut).toEqual(['TestRoomId']);
  });

  it('should run nothing once cleared', async () => {
    // Arrange
    const { timers, ranOut } = arrange();
    timers.schedule('TestRoomId', new Date('2026-11-09T10:06:00Z'));

    // Act
    timers.clear();
    await vi.advanceTimersByTimeAsync(10 * 60_000);

    // Assert
    expect(ranOut).toEqual([]);
  });
});
