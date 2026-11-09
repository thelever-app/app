import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WaitingScreen } from '../../src/screens/waiting-screen.tsx';
import { renderWithProviders } from '../support/render.tsx';
import { aGame } from '../support/game.ts';

/** Ana answered the first dilemma; Luis has not. */
const ANA_ANSWERED = aGame({
  answeredCount: 1,
  players: aGame().players.map((player) =>
    player.nickname === 'Ana' ? { ...player, answered: true } : player,
  ),
});

async function renderWaiting(game = ANA_ANSWERED, canChange = true) {
  const onChange = vi.fn();
  const onRevealEarly = vi.fn();
  const { t } = await renderWithProviders(
    <WaitingScreen
      game={game}
      onChange={canChange ? onChange : undefined}
      onRevealEarly={onRevealEarly}
    />,
    { game },
  );
  return { onChange, onRevealEarly, t };
}

describe('WaitingScreen', () => {
  it('should say the player answered the dilemma of the round and list who is missing', async () => {
    // Act
    const { t } = await renderWaiting();

    // Assert
    expect(screen.getByText(t('waiting.position', { position: 1, total: 3 }))).toBeDefined();
    expect(screen.getByRole('heading', { name: t('waiting.title') })).toBeDefined();
    expect(
      screen.getByRole('region', { name: t('playerList.pending', { count: 1 }) }),
    ).toBeDefined();
  });

  it('should let the player change their answer', async () => {
    // Arrange
    const { onChange, t } = await renderWaiting();

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('waiting.change') }));

    // Assert
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('should not offer to change an answer the player cannot change', async () => {
    // Act
    const { t } = await renderWaiting(ANA_ANSWERED, false);

    // Assert
    expect(screen.queryByRole('button', { name: t('waiting.change') })).toBeNull();
  });

  it('should let the host reveal it now and say what happens to who has not answered', async () => {
    // Arrange
    const { onRevealEarly, t } = await renderWaiting();

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('waiting.revealEarly') }));

    // Assert
    expect(onRevealEarly).toHaveBeenCalledOnce();
    expect(screen.getByText(t('waiting.revealCaption', { count: 1 }))).toBeDefined();
  });

  it('should tell a guest who may reveal it early', async () => {
    // Act
    const { t } = await renderWaiting({ ...ANA_ANSWERED, hostId: 'test-luis-id' });

    // Assert
    expect(screen.queryByRole('button', { name: t('waiting.revealEarly') })).toBeNull();
    expect(screen.getByText(t('waiting.guest', { host: 'Luis' }))).toBeDefined();
  });
});
