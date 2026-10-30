import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GameStateDto } from '@thelever-app/protocol';
import { DecisionPhase } from '../../src/phases/decision-phase.tsx';
import { aGame } from '../support/game.ts';
import { fakeConnection } from '../support/fake-connection.ts';
import { renderWithProviders } from '../support/render.tsx';

/** As the server sends it once Ana has answered all three: her answers and her progress. */
const allAnswered: GameStateDto = aGame({
  answers: [1, 2, 3].map((n) => ({ dilemmaId: `test-dilemma-${n}`, vote: `test-option-${n}a` })),
  players: [
    { playerId: 'test-ana-id', nickname: 'Ana', progress: 3, connected: true },
    { playerId: 'test-luis-id', nickname: 'Luis', progress: 1, connected: true },
  ],
});

async function renderPhase() {
  const fake = fakeConnection();
  const { t } = await renderWithProviders(<DecisionPhase />, { connection: fake.connection });
  return { ...fake, t };
}

describe('DecisionPhase', () => {
  it('should show the next dilemma while the player has dilemmas to answer', async () => {
    // Arrange
    const { deliver } = await renderPhase();

    // Act
    act(() => deliver(aGame()));

    // Assert
    expect(screen.getByRole('heading', { name: 'Texto del dilema 1' })).toBeDefined();
  });

  it('should send the answer to the room', async () => {
    // Arrange
    const { connection, deliver, t } = await renderPhase();
    act(() => deliver(aGame()));
    fireEvent.click(screen.getByRole('radio', { name: 'Opción 1A' }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));

    // Assert
    expect(connection.send).toHaveBeenCalledWith({
      type: 'answer-dilemma',
      dilemmaId: 'test-dilemma-1',
      vote: 'test-option-1a',
    });
  });

  it('should wait for the others once the player has answered every dilemma', async () => {
    // Arrange
    const { deliver, t } = await renderPhase();

    // Act
    act(() => deliver(allAnswered));

    // Assert
    expect(screen.getByRole('heading', { name: t('waiting.title') })).toBeDefined();
  });

  it('should let the player review their answers from the first dilemma', async () => {
    // Arrange
    const { deliver, t } = await renderPhase();
    act(() => deliver(allAnswered));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('waiting.review') }));

    // Assert
    expect(screen.getByRole('heading', { name: 'Texto del dilema 1' })).toBeDefined();
  });

  it('should come back to waiting after reviewing, sending nothing if no vote changed', async () => {
    // Arrange
    const { connection, deliver, t } = await renderPhase();
    act(() => deliver(allAnswered));
    fireEvent.click(screen.getByRole('button', { name: t('waiting.review') }));

    // Act
    for (let step = 0; step < 3; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));
    }

    // Assert
    expect(screen.getByRole('heading', { name: t('waiting.title') })).toBeDefined();
    expect(connection.send).not.toHaveBeenCalled();
  });

  describe('when the room rejects an answer', () => {
    /** Ana picks that option of the dilemma on screen and goes on with the button of that label. */
    function answer(option: string, continueLabel: string) {
      fireEvent.click(screen.getByRole('radio', { name: option }));
      fireEvent.click(screen.getByRole('button', { name: continueLabel }));
    }

    it('should show again the first dilemma the player has not answered', async () => {
      // Arrange
      const { deliver, t } = await renderPhase();
      act(() => deliver(aGame()));
      answer('Opción 1A', t('dilemma.continue'));

      // Act
      act(() => deliver({ type: 'error', command: 'answer-dilemma', code: 'dilemma-not-reached' }));

      // Assert
      expect(screen.getByRole('heading', { name: 'Texto del dilema 1' })).toBeDefined();
    });

    it('should let the player send the last answer again', async () => {
      // Arrange
      const { connection, deliver, t } = await renderPhase();
      act(() =>
        deliver(
          aGame({
            answers: [1, 2].map((n) => ({
              dilemmaId: `test-dilemma-${n}`,
              vote: `test-option-${n}a`,
            })),
          }),
        ),
      );
      answer('Opción 3A', t('dilemma.continue'));

      // Act
      act(() =>
        deliver({ type: 'error', command: 'answer-dilemma', code: 'option-not-in-dilemma' }),
      );
      answer('Opción 3B', t('dilemma.continue'));

      // Assert
      expect(connection.send).toHaveBeenLastCalledWith({
        type: 'answer-dilemma',
        dilemmaId: 'test-dilemma-3',
        vote: 'test-option-3b',
      });
    });

    it('should not move the player once the room saves the answer sent again', async () => {
      // Arrange
      const { deliver, t } = await renderPhase();
      act(() => deliver(aGame()));
      answer('Opción 1A', t('dilemma.continue'));
      act(() => deliver({ type: 'error', command: 'answer-dilemma', code: 'dilemma-not-reached' }));
      answer('Opción 1A', t('dilemma.continue'));

      // Act
      act(() =>
        deliver(
          aGame({
            gameVersion: 2,
            answers: [{ dilemmaId: 'test-dilemma-1', vote: 'test-option-1a' }],
          }),
        ),
      );

      // Assert
      expect(screen.getByRole('heading', { name: 'Texto del dilema 2' })).toBeDefined();
    });
  });
});
