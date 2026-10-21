import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WaitingScreen } from '../../src/screens/waiting-screen.tsx';
import { renderWithProviders } from '../support/render.tsx';
import { aGame } from '../support/game.ts';

async function renderWaiting() {
  const onReview = vi.fn();
  const game = aGame();
  const { t } = await renderWithProviders(<WaitingScreen game={game} onReview={onReview} />, {
    game,
  });
  return { onReview, t };
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
});
