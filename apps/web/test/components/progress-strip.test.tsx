import { act, render, screen, within } from '@testing-library/react';
import type { GameStateDto } from '@thelever-app/protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MOVED_ON_NOTICE_MS, ProgressStrip } from '../../src/components/progress-strip.tsx';
import { aGame } from '../support/game.ts';
import { providersFor, renderWithProviders } from '../support/render.tsx';

/** Luis and Pablo answered the dilemma of the round; Ana uses the screen. */
const PLAYERS: GameStateDto['players'] = ['Luis', 'Ana', 'Marta', 'Pablo', 'Sara', 'Nico'].map(
  (nickname) => ({
    playerId: `test-${nickname.toLowerCase()}-id`,
    nickname,
    avatar: { face: 'face-01', color: 'teal' } as const,
    answered: nickname === 'Luis' || nickname === 'Pablo',
    connected: nickname !== 'Marta',
    left: false,
  }),
);

function renderStrip(overrides: Partial<GameStateDto> = {}) {
  const game = aGame({ players: PLAYERS, answeredCount: 2, ...overrides });
  return renderWithProviders(<ProgressStrip game={game} label="TestLabel" />, { game });
}

describe('ProgressStrip', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should say what it is given about the dilemma on screen', async () => {
    // Act
    await renderStrip();

    // Assert
    expect(screen.getByText('TestLabel')).toBeDefined();
  });

  it('should show the player first and four players at most, with who answered and how many more there are', async () => {
    // Act
    const { t } = await renderStrip();

    // Assert
    const group = screen.getByRole('region', { name: t('progressStrip.group') });
    expect(
      within(group)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      t('progressStrip.playerPending', { name: t('playerList.you', { name: 'Ana' }) }),
      t('progressStrip.playerAnswered', { name: 'Luis' }),
      t('progressStrip.playerPending', {
        name: t('progressStrip.playerDisconnected', { name: 'Marta' }),
      }),
      t('progressStrip.playerAnswered', { name: 'Pablo' }),
    ]);
    expect(within(group).getByText(t('progressStrip.more', { count: 2 }))).toBeDefined();
  });

  it('should only say how many answered in an anonymous room', async () => {
    // Act
    const { t } = await renderStrip({
      players: PLAYERS.map((player) => ({ ...player, answered: null })),
    });

    // Assert
    const group = screen.getByRole('region', { name: t('progressStrip.anonymousGroup') });
    expect(
      within(group).getByText(t('progressStrip.anonymousCount', { count: 2, pending: 4 })),
    ).toBeDefined();
    expect(within(group).queryByRole('listitem')).toBeNull();
  });

  it('should offer to see the whole group', async () => {
    // Act
    const { t } = await renderStrip();

    // Assert
    expect(screen.getByRole('button', { name: t('progressStrip.showAll') })).toBeDefined();
  });

  it('should say for a few seconds who moved everyone on, in the place of «Ver todos»', async () => {
    // Arrange: the clock is faked once the translations are loaded.
    const round = { ...aGame().round, position: 1, movedOnBy: 'test-luis-id' };
    const game = aGame({ players: PLAYERS, answeredCount: 2, round });
    const { Providers, t } = await providersFor({ game });
    vi.useFakeTimers();

    // Act
    render(<ProgressStrip game={game} label="TestLabel" />, { wrapper: Providers });
    const shown = screen.getByRole('status').textContent;
    const showAllMeanwhile = screen.queryByRole('button', { name: t('progressStrip.showAll') });
    act(() => vi.advanceTimersByTime(MOVED_ON_NOTICE_MS));

    // Assert
    expect(shown).toBe(t('progressStrip.movedOn', { name: 'Luis' }));
    expect(showAllMeanwhile).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', { name: t('progressStrip.showAll') })).toBeDefined();
  });

  it('should leave out the group when told to', async () => {
    // Arrange
    const game = aGame();

    // Act
    const { t } = await renderWithProviders(
      <ProgressStrip game={game} label="TestLabel" showGroup={false} />,
      { game },
    );

    // Assert
    expect(screen.queryByRole('region', { name: t('progressStrip.group') })).toBeNull();
  });
});
