import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GameStateDto } from '@thelever-app/protocol';
import { DilemmaScreen } from '../../src/screens/dilemma-screen.tsx';
import { renderWithProviders } from '../support/render.tsx';
import { aGame } from '../support/game.ts';

async function renderScreen(game: GameStateDto = aGame(), initialPosition?: number) {
  const onAnswer = vi.fn();
  const onDone = vi.fn();
  const result = await renderWithProviders(
    <DilemmaScreen
      game={game}
      initialPosition={initialPosition}
      onAnswer={onAnswer}
      onDone={onDone}
    />,
    { game },
  );
  return { onAnswer, onDone, ...result };
}

const answeredFirst = aGame({ answers: [{ dilemmaId: 'test-dilemma-1', vote: 'test-option-1b' }] });

function option(name: string) {
  return screen.getByRole('radio', { name });
}

describe('DilemmaScreen', () => {
  it('should start on the first dilemma the player has not answered', async () => {
    // Act
    const { t } = await renderScreen(answeredFirst);

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

  it('should send the answer and show the next dilemma when the player continues', async () => {
    // Arrange
    const { onAnswer, t } = await renderScreen();
    fireEvent.click(option('Opción 1A'));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));

    // Assert
    expect(onAnswer).toHaveBeenCalledWith('test-dilemma-1', 'test-option-1a');
    expect(screen.getByRole('heading', { name: 'Texto del dilema 2' })).toBeDefined();
    expect(screen.getByRole('button', { name: t('dilemma.choose') })).toBeDefined();
  });

  it('should go back to the previous dilemma with the vote already given', async () => {
    // Arrange
    const { t } = await renderScreen(answeredFirst);

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.back') }));

    // Assert
    expect(screen.getByRole('heading', { name: 'Texto del dilema 1' })).toBeDefined();
    expect(option('Opción 1B').getAttribute('aria-checked')).toBe('true');
  });

  it('should send the new vote when the player changes an answer', async () => {
    // Arrange
    const { onAnswer, t } = await renderScreen(answeredFirst, 0);
    fireEvent.click(option('Opción 1A'));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));

    // Assert
    expect(onAnswer).toHaveBeenCalledWith('test-dilemma-1', 'test-option-1a');
  });

  it('should not send anything when the player continues without changing the vote', async () => {
    // Arrange
    const { onAnswer, t } = await renderScreen(answeredFirst, 0);

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));

    // Assert
    expect(onAnswer).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Texto del dilema 2' })).toBeDefined();
  });

  it('should not let the player go back from the first dilemma', async () => {
    // Act
    const { t } = await renderScreen();

    // Assert
    expect(screen.getByRole('button', { name: t('dilemma.back') })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('should show the vote once the room confirms it, even if the player went back before', async () => {
    // Arrange
    const { rerender, t } = await renderScreen();
    fireEvent.click(option('Opción 1A'));
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.back') }));

    // Act
    rerender(
      <DilemmaScreen
        game={aGame({ answers: [{ dilemmaId: 'test-dilemma-1', vote: 'test-option-1a' }] })}
        onAnswer={vi.fn()}
        onDone={vi.fn()}
      />,
    );

    // Assert
    expect(screen.getByRole('heading', { name: 'Texto del dilema 1' })).toBeDefined();
    expect(option('Opción 1A').getAttribute('aria-checked')).toBe('true');
  });

  it('should not let the player send the last answer twice while the room confirms it', async () => {
    // Arrange
    const { onAnswer, t } = await renderScreen(aGame(), 2);
    fireEvent.click(option('Opción 3A'));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));

    // Assert
    expect(onAnswer).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: t('dilemma.continue') })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('should tell when the player moves on from the last dilemma', async () => {
    // Arrange
    const { onDone, t } = await renderScreen(aGame(), 2);
    fireEvent.click(option('Opción 3A'));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));

    // Assert
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
    const threeOptions = aGame();
    const [first] = threeOptions.dilemmas;
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
