import { ConsoleLogger } from '@thelever-app/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeyedLock } from '../../concurrency/keyed-lock.ts';
import { RoundTimers } from '../../rooms/round-timers.ts';

/** Records each room it ran out, as the use case would; the clock may lag behind the timers. */
function arrange(lagMs = () => 0) {
  const ranOut: string[] = [];
  const timers = new RoundTimers(
    async (roomId) => {
      ranOut.push(roomId);
    },
    { now: () => new Date(Date.now() - lagMs()) },
    new KeyedLock(),
    (command) => command(),
    new ConsoleLogger(),
  );
  return { timers, ranOut };
}

describe('RoundTimers', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-09T10:00:00Z') });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should run out the round of a room when its time ends, once', async () => {
    // Arrange
    const { timers, ranOut } = arrange();

    // Act
    timers.schedule('TestRoomId', new Date('2026-11-09T10:01:00Z'));
    timers.schedule('TestRoomId', new Date('2026-11-09T10:01:00Z'));
    await vi.advanceTimersByTimeAsync(60_000 - 1);
    const before = [...ranOut];
    await vi.advanceTimersByTimeAsync(1);

    // Assert
    expect(before).toEqual([]);
    expect(ranOut).toEqual(['TestRoomId']);
  });

  it('should wait again when its timer fires before the moment by the clock', async () => {
    // Arrange: the first time the timer fires, the clock is still a millisecond behind.
    let lag = 1;
    const { timers, ranOut } = arrange(() => lag);
    timers.schedule('TestRoomId', new Date('2026-11-09T10:01:00Z'));

    // Act
    await vi.advanceTimersByTimeAsync(60_000);
    const early = [...ranOut];
    lag = 0;
    await vi.advanceTimersByTimeAsync(1);

    // Assert
    expect(early).toEqual([]);
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
    timers.schedule('TestRoomId', new Date('2026-11-09T10:01:00Z'));

    // Act
    timers.clear();
    await vi.advanceTimersByTimeAsync(10 * 60_000);

    // Assert
    expect(ranOut).toEqual([]);
  });
});
