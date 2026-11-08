import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WaitingScreen } from '../../src/screens/waiting-screen.tsx';
import { renderWithProviders } from '../support/render.tsx';
import { aGame } from '../support/game.ts';

async function renderWaiting(game = aGame()) {
  const onReview = vi.fn();
  const onLaunchReveal = vi.fn();
  const { t } = await renderWithProviders(
    <WaitingScreen game={game} onReview={onReview} onLaunchReveal={onLaunchReveal} />,
    {
      game,
    },
  );
  return { onReview, onLaunchReveal, t };
}

describe('WaitingScreen', () => {
  it('should say the player has finished and list who is missing', async () => {
    // Act
    const { t } = await renderWaiting();

    // Assert
    expect(screen.getByText(t('waiting.finished', { progress: 3, total: 3 }))).toBeDefined();
    expect(screen.getByRole('heading', { name: t('waiting.title') })).toBeDefined();
    expect(
      screen.getByRole('region', { name: t('playerList.pending', { count: 2 }) }),
    ).toBeDefined();
  });

  it('should let the player review their answers', async () => {
    // Arrange
    const { onReview, t } = await renderWaiting();

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('waiting.review') }));

    // Assert
    expect(onReview).toHaveBeenCalledOnce();
  });

  it('should let the host start the reveal and say what happens to what is not answered', async () => {
    // Arrange
    const { onLaunchReveal, t } = await renderWaiting();

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('waiting.launchReveal') }));

    // Assert
    expect(onLaunchReveal).toHaveBeenCalled();
    expect(screen.getByText(t('waiting.launchCaption', { count: 2 }))).toBeDefined();
  });

  it('should tell a guest who may start the reveal', async () => {
    // Act
    const { t } = await renderWaiting(aGame({ hostId: 'test-luis-id' }));

    // Assert
    expect(screen.queryByRole('button', { name: t('waiting.launchReveal') })).toBeNull();
    expect(screen.getByText(t('waiting.guest', { host: 'Luis' }))).toBeDefined();
  });

  it('should say the time ran out, and who decides when the reveal starts', async () => {
    // Act
    const { t } = await renderWaiting(aGame({ totalTimeRanOut: true, hostId: 'test-luis-id' }));

    // Assert
    expect(screen.getByRole('heading', { name: t('timeUp.title') })).toBeDefined();
    expect(screen.getByText(t('timeUp.subtitleGuest', { host: 'Luis' }))).toBeDefined();
  });
});
