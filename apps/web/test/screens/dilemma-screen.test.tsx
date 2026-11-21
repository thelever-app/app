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

  it('should show the category of the dilemma, on the step of the vote', async () => {
    // Act
    const { t } = await renderScreen(
      aGame({ dilemmas: aGame().dilemmas.map((d) => ({ ...d, category: 'loyalty' as const })) }),
    );

    // Assert
    expect(screen.getByText(t('categories.loyalty'))).toBeDefined();
    const [vote] = screen.getAllByRole('listitem').filter((item) => item.closest('ol'));
    expect(vote?.getAttribute('aria-current')).toBe('step');
  });

  it('should keep the menu and the group on the step of the prediction', async () => {
    // Arrange
    const { t } = await renderScreen(aGame({ playersToPredict: ['test-luis-id'] }));
    fireEvent.click(option('Opción 1A'));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));

    // Assert
    expect(screen.getByRole('heading', { name: t('predict.voteQuestion') })).toBeDefined();
    expect(screen.getByRole('button', { name: t('gameMenu.open') })).toBeDefined();
    expect(screen.getByRole('region', { name: t('progressStrip.group') })).toBeDefined();
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
            distributionPrediction: null,
            ready: false,
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

  it('should say in an anonymous room that the vote is never shown, and go on to predict the distribution', async () => {
    // Arrange
    const { onAnswer, onDone, t } = await renderScreen(ANONYMOUS);
    const privacy = screen.queryByText(t('dilemma.privacyAnonymous'));
    fireEvent.click(option('Opción 1A'));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));

    // Assert
    expect(privacy).not.toBeNull();
    expect(onAnswer).toHaveBeenCalledWith({ dilemmaId: 'test-dilemma-1', vote: 'test-option-1a' });
    expect(screen.getByRole('heading', { name: t('distribution.question') })).toBeDefined();
    expect(screen.getByRole('slider')).toBeDefined();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('should send the distribution prediction when the player lets go of the bar, and with «Listo»', async () => {
    // Arrange
    const { onAnswer, onDone, t } = await renderScreen(ANONYMOUS);
    fireEvent.click(option('Opción 1A'));
    fireEvent.click(screen.getByRole('button', { name: t('dilemma.continue') }));
    onAnswer.mockClear();
    const slider = screen.getByRole('slider');

    // Act
    fireEvent.change(slider, { target: { value: '70' } });
    const whileMoving = onAnswer.mock.calls.length;
    fireEvent.pointerUp(slider);
    fireEvent.click(screen.getByRole('button', { name: t('predict.next') }));

    // Assert
    const prediction = [
      { optionId: 'test-option-1a', share: 70 },
      { optionId: 'test-option-1b', share: 30 },
    ];
    expect(whileMoving).toBe(0);
    expect(onAnswer.mock.calls).toEqual([
      [{ dilemmaId: 'test-dilemma-1', vote: 'test-option-1a', distributionPrediction: prediction }],
      [
        {
          dilemmaId: 'test-dilemma-1',
          vote: 'test-option-1a',
          distributionPrediction: prediction,
          ready: true,
        },
      ],
    ]);
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

  describe('for the person in the gap', () => {
    /** The first dilemma is about Ana, who uses the screen; she predicts Luis and Marta. */
    function aboutAna(game: GameStateDto = aGame()): GameStateDto {
      const [first, ...rest] = game.dilemmas;
      return {
        ...game,
        dilemmas: [
          { ...first!, text: 'Le mientes a {gap}', personInTheGap: 'test-ana-id' },
          ...rest,
        ],
        playersToPredict: ['test-luis-id', 'test-marta-id'],
        players: [
          ...game.players,
          {
            playerId: 'test-marta-id',
            nickname: 'Marta',
            avatar: { face: 'face-03', color: 'olive' },
            answered: game.players[0]!.answered,
            connected: true,
            left: false,
          },
        ],
      };
    }

    it('should tell them it is about them, without a vote, with the menu and who has answered', async () => {
      // Act
      const { t } = await renderScreen(aboutAna());

      // Assert
      expect(screen.getByText(t('aboutYou.title'))).toBeDefined();
      expect(screen.getByText(t('aboutYou.nominal'))).toBeDefined();
      expect(screen.getByRole('heading', { name: t('predict.aboutYouQuestion') })).toBeDefined();
      expect(screen.queryByRole('button', { name: t('dilemma.continue') })).toBeNull();
      expect(screen.queryByRole('button', { name: t('predict.back') })).toBeNull();
      expect(screen.getByRole('button', { name: t('gameMenu.open') })).toBeDefined();
      expect(screen.getByRole('button', { name: t('progressStrip.showAll') })).toBeDefined();
      expect(
        screen.getByText(t('progressStrip.aboutYou', { position: 1, total: 3 })),
      ).toBeDefined();
    });

    it('should answer with every prediction and no vote', async () => {
      // Arrange
      const { onAnswer, onDone, t } = await renderScreen(aboutAna());
      fireEvent.click(
        screen
          .getByRole('radiogroup', { name: t('predict.voteOf', { name: 'Luis' }) })
          .querySelector('[role="radio"]')!,
      );
      fireEvent.click(
        screen
          .getByRole('radiogroup', { name: t('predict.voteOf', { name: 'Marta' }) })
          .querySelector('[role="radio"]')!,
      );

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('predict.next') }));

      // Assert
      expect(onAnswer).toHaveBeenCalledWith({
        dilemmaId: 'test-dilemma-1',
        vote: null,
        votePredictions: [
          { playerId: 'test-luis-id', vote: 'test-option-1a' },
          { playerId: 'test-marta-id', vote: 'test-option-1a' },
        ],
      });
      expect(onDone).toHaveBeenCalledOnce();
    });

    it('should predict the distribution of the others without a vote in an anonymous room', async () => {
      // Arrange
      const { onAnswer, t } = await renderScreen({ ...aboutAna(ANONYMOUS), playersToPredict: [] });

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('predict.next') }));

      // Assert
      expect(screen.getByText(t('aboutYou.anonymous'))).toBeDefined();
      expect(
        screen.getByRole('heading', { name: t('distribution.aboutYouQuestion') }),
      ).toBeDefined();
      expect(screen.queryByText(t('distribution.yourVote'))).toBeNull();
      expect(onAnswer).toHaveBeenCalledWith({
        dilemmaId: 'test-dilemma-1',
        vote: null,
        distributionPrediction: [
          { optionId: 'test-option-1a', share: 50 },
          { optionId: 'test-option-1b', share: 50 },
        ],
        ready: true,
      });
    });
  });
});
