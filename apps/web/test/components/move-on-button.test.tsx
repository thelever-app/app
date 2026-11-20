import { fireEvent, screen } from '@testing-library/react';
import type { GameStateDto } from '@thelever-app/protocol';
import { describe, expect, it, vi } from 'vitest';
import { MoveOnButton } from '../../src/components/move-on-button.tsx';
import { aGame } from '../support/game.ts';
import { renderWithProviders } from '../support/render.tsx';

/** Ana uses the screen; Marta is disconnected and Pablo left the game. */
const PLAYERS: GameStateDto['players'] = ['Ana', 'Luis', 'Sara', 'Marta', 'Pablo'].map(
  (nickname) => ({
    playerId: `test-${nickname.toLowerCase()}-id`,
    nickname,
    avatar: { face: 'face-01', color: 'teal' } as const,
    answered: true,
    connected: nickname !== 'Marta',
    left: nickname === 'Pablo',
  }),
);

async function renderButton({
  readyToMoveOn = [],
  host = false,
}: { readonly readyToMoveOn?: readonly string[]; readonly host?: boolean } = {}) {
  const game = aGame({ players: PLAYERS, readyToMoveOn: [...readyToMoveOn] });
  const onReady = vi.fn();
  const onMoveEveryoneOn = vi.fn();
  const rendered = await renderWithProviders(
    <MoveOnButton
      game={game}
      label="TestNext"
      onReady={onReady}
      onMoveEveryoneOn={host ? onMoveEveryoneOn : undefined}
    />,
    { game },
  );
  return { ...rendered, onReady, onMoveEveryoneOn };
}

describe('MoveOnButton', () => {
  it('should let the player say they are ready, with no count while nobody is', async () => {
    // Arrange
    const { onReady } = await renderButton();

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'TestNext' }));

    // Assert
    expect(onReady).toHaveBeenCalledOnce();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('should count who is ready among those connected and still in the game', async () => {
    // Act
    const { t } = await renderButton({
      readyToMoveOn: ['test-luis-id', 'test-marta-id', 'test-pablo-id'],
    });

    // Assert
    expect(screen.getByRole('status').textContent).toBe(
      t('moveOn.readyCount', { ready: 1, of: 3 }),
    );
    expect(screen.getByRole('button', { name: 'TestNext' })).toBeDefined();
  });

  it('should make who is ready wait for the rest', async () => {
    // Act
    const { t } = await renderButton({ readyToMoveOn: ['test-ana-id'] });

    // Assert
    expect(
      (screen.getByRole('button', { name: t('moveOn.waiting') }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('should let the host who is ready move everyone on without waiting', async () => {
    // Arrange
    const { t, onMoveEveryoneOn } = await renderButton({
      readyToMoveOn: ['test-ana-id'],
      host: true,
    });

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('moveOn.everyone') }));

    // Assert
    expect(onMoveEveryoneOn).toHaveBeenCalledOnce();
  });
});
