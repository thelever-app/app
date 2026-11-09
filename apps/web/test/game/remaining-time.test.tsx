import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatRemaining,
  noteServerTime,
  useRemainingSeconds,
} from '../../src/game/remaining-time.ts';

describe('formatRemaining', () => {
  it.each([
    [252, '4:12'],
    [60, '1:00'],
    [5, '0:05'],
    [0, '0:00'],
  ])('should show %i seconds as %s', (seconds, shown) => {
    // Act & Assert
    expect(formatRemaining(seconds)).toBe(shown);
  });
});

describe('useRemainingSeconds', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-09T10:00:00Z') });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should count by the clock of the server, even when the device is behind', () => {
    // Arrange: the server is already 30 s further on than the device.
    const ends = '2026-11-09T10:06:00.000Z';
    const serverTime = '2026-11-09T10:00:30.000Z';

    // Act
    const { result } = renderHook(() => useRemainingSeconds(ends, serverTime));

    // Assert
    expect(result.current).toBe(330);
  });

  it('should keep the clock of the server as it was when the state arrived, however late it shows', () => {
    // Arrange: the state arrives with the server 30 s ahead, and its countdown shows 8 s later.
    const ends = '2026-11-09T10:06:00.000Z';
    const serverTime = '2026-11-09T10:01:30.000Z';
    noteServerTime(serverTime);
    vi.advanceTimersByTime(8000);

    // Act
    const { result } = renderHook(() => useRemainingSeconds(ends, serverTime));

    // Assert
    expect(result.current).toBe(262);
  });

  it('should stop at 0 once the time is over', () => {
    // Act
    const { result } = renderHook(() =>
      useRemainingSeconds('2026-11-09T09:59:00.000Z', '2026-11-09T10:00:00.000Z'),
    );

    // Assert
    expect(result.current).toBe(0);
  });
});
