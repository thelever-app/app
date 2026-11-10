import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameTimer } from '../../src/game/game-timer.tsx';
import { aGame } from '../support/game.ts';
import { providersFor } from '../support/render.tsx';

/** The game of the fixture ends its round at 10:01:00 by the clock of the server. */
async function renderTimerAt(now: string) {
  vi.setSystemTime(new Date(now));
  const { Providers } = await providersFor();
  render(<GameTimer game={aGame({ serverTime: now })} />, { wrapper: Providers });
  return screen.getByRole('timer');
}

describe('GameTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should beat in the last seconds of the time per dilemma', async () => {
    // Act
    const timer = await renderTimerAt('2026-11-09T10:00:51.000Z');

    // Assert
    expect(timer.hasAttribute('data-last-seconds')).toBe(true);
  });

  it('should stay still before the last seconds', async () => {
    // Act
    const timer = await renderTimerAt('2026-11-09T10:00:49.000Z');

    // Assert
    expect(timer.hasAttribute('data-last-seconds')).toBe(false);
  });

  it('should stay still once the time is over', async () => {
    // Act
    const timer = await renderTimerAt('2026-11-09T10:01:05.000Z');

    // Assert
    expect(timer.hasAttribute('data-last-seconds')).toBe(false);
  });
});
