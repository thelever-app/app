import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnswerSteps } from '../../src/game/answer-steps.tsx';
import { renderWithProviders } from '../support/render.tsx';

/** Each step, in order, of the list named as the steps of an answer. */
function steps(label: string) {
  return within(screen.getByRole('list', { name: label })).getAllByRole('listitem');
}

describe('AnswerSteps', () => {
  it('should mark the vote as the step the player is on, before the prediction', async () => {
    // Act
    const { t } = await renderWithProviders(<AnswerSteps current="vote" withVote />);

    // Assert
    const [vote, prediction] = steps(t('answerSteps.label'));
    expect(vote?.textContent).toContain(t('answerSteps.vote'));
    expect(vote?.getAttribute('aria-current')).toBe('step');
    expect(prediction?.textContent).toContain(t('answerSteps.prediction'));
    expect(prediction?.getAttribute('aria-current')).toBeNull();
  });

  it('should mark the vote as done once the player is on the prediction', async () => {
    // Act
    const { t } = await renderWithProviders(<AnswerSteps current="prediction" withVote />);

    // Assert
    const [vote, prediction] = steps(t('answerSteps.label'));
    expect(vote?.hasAttribute('data-done')).toBe(true);
    expect(prediction?.getAttribute('aria-current')).toBe('step');
  });

  it('should leave only the prediction to the person in the gap, who does not vote', async () => {
    // Act
    const { t } = await renderWithProviders(<AnswerSteps current="prediction" withVote={false} />);

    // Assert
    expect(steps(t('answerSteps.label')).map(({ textContent }) => textContent)).toEqual([
      `1${t('answerSteps.prediction')}`,
    ]);
  });
});
