import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DecisionPhase } from '../../src/phases/decision-phase.tsx';
import { aGame } from '../support/game.ts';
import { fakeConnection } from '../support/fake-connection.ts';
import { renderWithProviders } from '../support/render.tsx';

/** A nominal room of Ana and Luis: Ana predicts Luis in every dilemma. */
const nominal = aGame({
  dilemmas: aGame().dilemmas.map((dilemma) => ({ ...dilemma, predictionSubset: ['test-luis-id'] })),
});

async function renderNominal() {
  const fake = fakeConnection();
  const rendered = await renderWithProviders(<DecisionPhase />, { connection: fake.connection });
  act(() => fake.deliver(nominal));
  return { ...fake, ...rendered };
}

describe('a dilemma of a nominal room', () => {
  it('should ask for the predictions once the player votes, and send each change', async () => {
    // Arrange
    const { connection, t } = await renderNominal();
    fireEvent.click(screen.getByRole('radio', { name: 'Opción 1A' }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));
    fireEvent.click(
      screen.getByRole('radio', { name: t('predict.matchValue', { count: 1, total: 1 }) }),
    );

    // Assert
    expect(screen.getByRole('button', { name: t('predict.missing', { count: 1 }) })).toHaveProperty(
      'disabled',
      true,
    );
    expect(connection.send).toHaveBeenLastCalledWith({
      type: 'answer-dilemma',
      dilemmaId: 'test-dilemma-1',
      vote: 'test-option-1a',
      matchPrediction: 1,
      votePredictions: [],
    });
  });

  it('should take the player to the next dilemma once every prediction is made', async () => {
    // Arrange
    const { connection, t } = await renderNominal();
    fireEvent.click(screen.getByRole('radio', { name: 'Opción 1A' }));
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));
    fireEvent.click(
      screen.getByRole('radio', { name: t('predict.matchValue', { count: 0, total: 1 }) }),
    );
    const luis = screen.getByRole('radiogroup', { name: t('predict.voteOf', { name: 'Luis' }) });

    // Act
    fireEvent.click(luis.querySelector('[role="radio"]')!);
    fireEvent.click(screen.getByRole('button', { name: t('predict.next') }));

    // Assert
    expect(connection.send).toHaveBeenLastCalledWith({
      type: 'answer-dilemma',
      dilemmaId: 'test-dilemma-1',
      vote: 'test-option-1a',
      matchPrediction: 0,
      votePredictions: [{ playerId: 'test-luis-id', vote: 'test-option-1a' }],
    });
    expect(screen.getByRole('heading', { name: 'Texto del dilema 2' })).toBeDefined();
  });

  it('should not let the player predict before voting', async () => {
    // Arrange
    const { t } = await renderNominal();

    // Assert: the predictions only come after «Continuar», which needs a vote.
    expect(screen.queryByText(t('predict.voteQuestion'))).toBeNull();
    expect(screen.getByRole('button', { name: t('dilemma.choose') })).toHaveProperty(
      'disabled',
      true,
    );
  });
});
