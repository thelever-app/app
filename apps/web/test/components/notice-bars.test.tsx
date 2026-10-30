import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnswerNotSaved } from '../../src/components/answer-not-saved.tsx';
import { ReconnectingBar } from '../../src/components/reconnecting-bar.tsx';
import { renderWithProviders } from '../support/render.tsx';

describe('ReconnectingBar', () => {
  it('should tell, politely, that the answers are kept while it reconnects', async () => {
    // Act
    const { t } = await renderWithProviders(<ReconnectingBar />);

    // Assert
    expect(screen.getByRole('status').textContent).toBe(t('notices.reconnecting'));
  });
});

describe('AnswerNotSaved', () => {
  it('should alert at once that the last answer was not saved', async () => {
    // Act
    const { t } = await renderWithProviders(<AnswerNotSaved onDismiss={() => {}} />);

    // Assert
    expect(screen.getByRole('alert').textContent).toContain(t('notices.answerNotSaved'));
  });

  it('should be dismissed with its button', async () => {
    // Arrange
    const onDismiss = vi.fn();
    const { t } = await renderWithProviders(<AnswerNotSaved onDismiss={onDismiss} />);

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('notices.dismiss') }));

    // Assert
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
