import { fireEvent, screen } from '@testing-library/react';
import type { PredictedShare } from '@thelever-app/game/distribution-prediction';
import type { GameStateDto } from '@thelever-app/protocol';
import { describe, expect, it, vi } from 'vitest';
import { DistributionPredictCard } from '../../src/game/distribution-predict-card.tsx';
import { renderWithProviders } from '../support/render.tsx';

/** A dilemma of four options, as the player sees them. */
const DILEMMA: GameStateDto['dilemmas'][number] = {
  dilemmaId: 'test-dilemma',
  text: 'Texto del dilema',
  personInTheGap: null,
  options: ['A', 'B', 'C', 'D'].map((letter) => ({
    optionId: `test-option-${letter}`,
    text: `Opción ${letter}`,
  })),
};

function sharesOf(...shares: readonly number[]): PredictedShare[] {
  return shares.map((share, index) => ({ optionId: DILEMMA.options[index]!.optionId, share }));
}

async function renderCard(prediction = sharesOf(40, 30, 20, 10)) {
  const onChange = vi.fn();
  const onRelease = vi.fn();
  const onReady = vi.fn();
  const result = await renderWithProviders(
    <DistributionPredictCard
      dilemma={DILEMMA}
      vote="test-option-B"
      prediction={prediction}
      personInTheGap={undefined}
      isSending={false}
      onChange={onChange}
      onRelease={onRelease}
      onBack={vi.fn()}
      onReady={onReady}
    />,
  );
  return { onChange, onRelease, onReady, ...result };
}

describe('DistributionPredictCard', () => {
  it('should show a bar for each option with its share, and mark the vote of the player', async () => {
    // Act
    const { t } = await renderCard();

    // Assert
    const sliders = screen.getAllByRole<HTMLInputElement>('slider');
    expect(sliders.map(({ value }) => value)).toEqual(['40', '30', '20', '10']);
    expect(sliders.every(({ step }) => step === '5')).toBe(true);
    expect(screen.getByText(t('distribution.yourVote')).closest('li')?.textContent).toContain(
      'Opción B',
    );
  });

  it('should adjust the other options in proportion as one bar moves', async () => {
    // Arrange
    const { onChange, t } = await renderCard();

    // Act
    fireEvent.change(
      screen.getByRole('slider', { name: t('distribution.shareOf', { option: 'Opción A' }) }),
      { target: { value: '60' } },
    );

    // Assert
    expect(onChange).toHaveBeenCalledWith(sharesOf(60, 20, 15, 5));
  });

  it('should hand the prediction over when the player lets go of a bar, by pointer or by keyboard', async () => {
    // Arrange
    const { onRelease, t } = await renderCard();
    const slider = screen.getByRole('slider', {
      name: t('distribution.shareOf', { option: 'Opción D' }),
    });

    // Act
    fireEvent.pointerUp(slider);
    fireEvent.keyUp(slider, { key: 'ArrowRight' });

    // Assert
    expect(onRelease).toHaveBeenCalledTimes(2);
    expect(onRelease).toHaveBeenLastCalledWith(sharesOf(40, 30, 20, 10));
  });

  it('should be ready at any moment, since the shares always add up to 100 %', async () => {
    // Arrange
    const { onReady, t } = await renderCard();

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('predict.next') }));

    // Assert
    expect(onReady).toHaveBeenCalledOnce();
  });
});
