import { act, fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GameStateDto } from '@thelever-app/protocol';
import { DecisionPhase } from '../../src/phases/decision-phase.tsx';
import { aGame } from '../support/game.ts';
import { fakeConnection } from '../support/fake-connection.ts';
import { renderWithProviders } from '../support/render.tsx';

/** A nominal room: Ana predicts how many chose the same as her and what Luis voted. */
const NOMINAL: GameStateDto = aGame({
  dilemmas: aGame().dilemmas.map((dilemma) => ({ ...dilemma, predictionSubset: ['test-luis-id'] })),
});

/** An anonymous room, which never tells who answered. */
const ANONYMOUS: GameStateDto = aGame({
  players: aGame().players.map((player) => ({ ...player, answered: null })),
});

/** As the server sends the nominal room once Ana answered the first dilemma with every prediction. */
const ANSWERED: GameStateDto = {
  ...NOMINAL,
  gameVersion: 2,
  answeredCount: 1,
  answers: [
    {
      dilemmaId: 'test-dilemma-1',
      vote: 'test-option-1a',
      matchPrediction: 1,
      votePredictions: [{ playerId: 'test-luis-id', vote: 'test-option-1b' }],
    },
  ],
  players: NOMINAL.players.map((player) =>
    player.nickname === 'Ana' ? { ...player, answered: true } : player,
  ),
};

async function renderPhase(game: GameStateDto) {
  const fake = fakeConnection();
  const { t } = await renderWithProviders(<DecisionPhase />, { connection: fake.connection });
  act(() => fake.deliver(game));
  return { ...fake, t };
}

describe('DecisionPhase', () => {
  it('should show the dilemma of the round', async () => {
    // Act
    await renderPhase(aGame({ round: { ...aGame().round, position: 1 } }));

    // Assert
    expect(screen.getByRole('heading', { name: 'Texto del dilema 2' })).toBeDefined();
  });

  it('should send the vote of an anonymous room with «Listo», once', async () => {
    // Arrange
    const { connection, t } = await renderPhase(ANONYMOUS);
    fireEvent.click(screen.getByRole('radio', { name: 'Opción 1A' }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.done') }));

    // Assert
    expect(connection.send).toHaveBeenCalledWith({
      type: 'answer-dilemma',
      dilemmaId: 'test-dilemma-1',
      vote: 'test-option-1a',
    });
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: t('dilemma.done') }).disabled,
    ).toBe(true);
  });

  it('should send the vote of a nominal room as it continues, and the predictions with «Listo»', async () => {
    // Arrange
    const { connection, t } = await renderPhase(NOMINAL);
    fireEvent.click(screen.getByRole('radio', { name: 'Opción 1A' }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));
    const afterVote = [...connection.send.mock.calls];
    fireEvent.click(
      screen.getByRole('radio', { name: t('predict.matchValue', { count: 1, total: 1 }) }),
    );
    const luis = screen.getByRole('radiogroup', { name: t('predict.voteOf', { name: 'Luis' }) });
    fireEvent.click(within(luis).getByRole('radio', { name: 'Opción 1B' }));
    const whilePredicting = connection.send.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: t('predict.next') }));

    // Assert
    expect(afterVote).toEqual([
      [
        {
          type: 'answer-dilemma',
          dilemmaId: 'test-dilemma-1',
          vote: 'test-option-1a',
          matchPrediction: null,
          votePredictions: [],
        },
      ],
    ]);
    expect(whilePredicting).toBe(1);
    expect(connection.send).toHaveBeenLastCalledWith(ANSWERED_MESSAGE);
  });

  it('should wait for the others once the room says the player answered', async () => {
    // Act
    const { t } = await renderPhase(ANSWERED);

    // Assert
    expect(screen.getByRole('heading', { name: t('waiting.title') })).toBeDefined();
  });

  it('should wait for the others once an anonymous room has the answer of the player', async () => {
    // Act
    const { t } = await renderPhase({ ...ANONYMOUS, answers: ANSWERED.answers, answeredCount: 1 });

    // Assert
    expect(screen.getByRole('heading', { name: t('waiting.title') })).toBeDefined();
  });

  it('should let the player change their answer and come back to waiting, keeping the predictions', async () => {
    // Arrange
    const { connection, t } = await renderPhase(ANSWERED);
    fireEvent.click(screen.getByRole('button', { name: t('waiting.change') }));
    const voted = screen.getByRole<HTMLButtonElement>('radio', { name: 'Opción 1A' });
    const votedBefore = voted.getAttribute('aria-checked');

    // Act
    fireEvent.click(screen.getByRole('radio', { name: 'Opción 1B' }));
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));
    fireEvent.click(screen.getByRole('button', { name: t('predict.next') }));

    // Assert
    expect(votedBefore).toBe('true');
    expect(connection.send).toHaveBeenNthCalledWith(1, {
      ...ANSWERED_MESSAGE,
      vote: 'test-option-1b',
    });
    expect(connection.send).toHaveBeenLastCalledWith({
      ...ANSWERED_MESSAGE,
      vote: 'test-option-1b',
    });
    expect(screen.getByRole('heading', { name: t('waiting.title') })).toBeDefined();
  });

  it('should send nothing more when the player changes nothing', async () => {
    // Arrange
    const { connection, t } = await renderPhase(ANSWERED);
    fireEvent.click(screen.getByRole('button', { name: t('waiting.change') }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));

    // Assert
    expect(connection.send).not.toHaveBeenCalled();
  });

  it('should let the player send the answer again once the room rejects it', async () => {
    // Arrange
    const { connection, deliver, t } = await renderPhase(ANONYMOUS);
    fireEvent.click(screen.getByRole('radio', { name: 'Opción 1A' }));
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.done') }));

    // Act
    act(() => deliver({ type: 'error', command: 'answer-dilemma', code: 'option-not-in-dilemma' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Opción 1B' }));
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.done') }));

    // Assert
    expect(connection.send).toHaveBeenLastCalledWith({
      type: 'answer-dilemma',
      dilemmaId: 'test-dilemma-1',
      vote: 'test-option-1b',
    });
  });
});

/** What Ana sends with «Listo» for the answer the room keeps in ANSWERED. */
const ANSWERED_MESSAGE = {
  type: 'answer-dilemma',
  dilemmaId: 'test-dilemma-1',
  vote: 'test-option-1a',
  matchPrediction: 1,
  votePredictions: [{ playerId: 'test-luis-id', vote: 'test-option-1b' }],
};
