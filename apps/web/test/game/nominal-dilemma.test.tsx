import { act, fireEvent, screen, within } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';
import { DecisionPhase } from '../../src/phases/decision-phase.tsx';
import { aGame } from '../support/game.ts';
import { fakeConnection } from '../support/fake-connection.ts';
import { renderWithProviders } from '../support/render.tsx';

/** A nominal room of Ana and Luis: Ana predicts Luis in every dilemma. */
const nominal = aGame({
  playersToPredict: ['test-luis-id'],
});

/** Ana predicts that Luis voted that option. */
function predictLuis(t: TFunction, option: string): void {
  const luis = screen.getByRole('radiogroup', { name: t('predict.voteOf', { name: 'Luis' }) });
  fireEvent.click(within(luis).getByRole('radio', { name: option }));
}

async function renderNominal() {
  const fake = fakeConnection();
  const rendered = await renderWithProviders(<DecisionPhase onShowQr={() => {}} />, {
    connection: fake.connection,
  });
  act(() => fake.deliver(nominal));
  return { ...fake, ...rendered };
}

describe('a dilemma of a nominal room', () => {
  it('should ask for the predictions once the player votes, and not send them until «Listo»', async () => {
    // Arrange
    const { connection, t } = await renderNominal();
    fireEvent.click(screen.getByRole('radio', { name: 'Opción 1A' }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));
    const missing = screen.getByRole('button', { name: t('predict.missing', { count: 1 }) });
    const disabledBefore = missing.hasAttribute('disabled');
    predictLuis(t, 'Opción 1B');

    // Assert
    expect(disabledBefore).toBe(true);
    expect(screen.getByRole('button', { name: t('predict.next') })).toHaveProperty(
      'disabled',
      false,
    );
    expect(connection.send).toHaveBeenCalledOnce();
  });

  it('should send the predictions made so far when the player goes back to their vote', async () => {
    // Arrange
    const { connection, t } = await renderNominal();
    fireEvent.click(screen.getByRole('radio', { name: 'Opción 1A' }));
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));
    predictLuis(t, 'Opción 1B');

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('predict.back') }));

    // Assert
    expect(connection.send).toHaveBeenLastCalledWith({
      type: 'answer-dilemma',
      dilemmaId: 'test-dilemma-1',
      vote: 'test-option-1a',
      votePredictions: [{ playerId: 'test-luis-id', vote: 'test-option-1b' }],
    });
  });

  it('should let the player go back to their vote from the predictions', async () => {
    // Arrange
    const { t } = await renderNominal();
    fireEvent.click(screen.getByRole('radio', { name: 'Opción 1A' }));
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('predict.back') }));

    // Assert
    expect(screen.getByRole('radio', { name: 'Opción 1A' }).getAttribute('aria-checked')).toBe(
      'true',
    );
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
