import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GameStateDto } from '@thelever-app/protocol';
import { DilemmaScreen } from '../../src/screens/dilemma-screen.tsx';
import { renderWithProviders } from '../support/render.tsx';
import { aGame } from '../support/game.ts';

async function renderScreen(game: GameStateDto = aGame()) {
  const onAnswer = vi.fn();
  const onDone = vi.fn();
  const result = await renderWithProviders(
    <DilemmaScreen
      game={game}
      onAnswer={onAnswer}
      onDone={onDone}
      onRevealEarly={vi.fn()}
      onReport={vi.fn()}
      onSkip={vi.fn()}
      onLeave={vi.fn()}
      onShowQr={vi.fn()}
    />,
    { game },
  );
  return { onAnswer, onDone, ...result };
}

const ANONYMOUS = aGame({ players: aGame().players.map((p) => ({ ...p, answered: null })) });

function option(name: string) {
  return screen.getByRole('radio', { name });
}

describe('DilemmaScreen', () => {
  it('should show the dilemma of the round and say which one it is', async () => {
    // Act
    const { t } = await renderScreen(aGame({ round: { ...aGame().round, position: 1 } }));

    // Assert
    expect(screen.getByRole('heading', { name: 'Texto del dilema 2' })).toBeDefined();
    expect(screen.getByText(t('progressStrip.position', { position: 2, total: 3 }))).toBeDefined();
  });

  it('should not let the player continue until they choose an option', async () => {
    // Act
    const { t } = await renderScreen();

    // Assert
    expect(screen.getByRole('button', { name: t('dilemma.choose') })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('should offer the options as a group named by the dilemma, of which only one can be chosen', async () => {
    // Act
    await renderScreen();

    // Assert
    const group = screen.getByRole('radiogroup', { name: 'Texto del dilema 1' });
    expect(group.querySelectorAll('[role="radio"]')).toHaveLength(2);
  });

  it('should mark the chosen option', async () => {
    // Arrange
    await renderScreen();

    // Act
    fireEvent.click(option('Opción 1A'));

    // Assert
    expect(option('Opción 1A').getAttribute('aria-checked')).toBe('true');
    expect(option('Opción 1B').getAttribute('aria-checked')).toBe('false');
  });

  it('should start from the vote the room has', async () => {
    // Act
    await renderScreen(
      aGame({
        answers: [
          {
            dilemmaId: 'test-dilemma-1',
            vote: 'test-option-1b',
            votePredictions: [],
          },
        ],
      }),
    );

    // Assert
    expect(option('Opción 1B').getAttribute('aria-checked')).toBe('true');
  });

  it('should offer no way back to a past round', async () => {
    // Act
    await renderScreen(aGame({ round: { ...aGame().round, position: 1 } }));

    // Assert
    expect(screen.queryByRole('button', { name: /anterior|volver/i })).toBeNull();
  });

  it('should say in an anonymous room that the vote is never shown, and confirm it with «Listo»', async () => {
    // Arrange
    const { onAnswer, onDone, t } = await renderScreen(ANONYMOUS);
    fireEvent.click(option('Opción 1A'));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.done') }));

    // Assert
    expect(screen.getByText(t('dilemma.privacyAnonymous'))).toBeDefined();
    expect(onAnswer).toHaveBeenCalledWith({ dilemmaId: 'test-dilemma-1', vote: 'test-option-1a' });
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('should open the whole group from the header', async () => {
    // Arrange
    const { t } = await renderScreen();

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('progressStrip.showAll') }));

    // Assert
    expect(screen.getByRole('dialog', { name: t('groupSheet.title') })).toBeDefined();
  });

  it('should lay out two options side by side and more as a list', async () => {
    // Arrange
    const [first] = aGame().dilemmas;
    const game = aGame({
      dilemmas: [
        {
          ...first!,
          options: [...first!.options, { optionId: 'test-option-1c', text: 'Opción 1C' }],
        },
      ],
    });

    // Act
    await renderScreen(game);

    // Assert
    expect(option('Opción 1C').parentElement?.getAttribute('data-layout')).toBe('list');
  });
});
