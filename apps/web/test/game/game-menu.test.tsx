import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DecisionPhase } from '../../src/phases/decision-phase.tsx';
import { aGame } from '../support/game.ts';
import { fakeConnection } from '../support/fake-connection.ts';
import { renderWithProviders } from '../support/render.tsx';

async function renderPhase(game = aGame()) {
  const fake = fakeConnection();
  const rendered = await renderWithProviders(<DecisionPhase />, { connection: fake.connection });
  act(() => fake.deliver(game));
  return { ...fake, ...rendered };
}

describe('the menu of the game', () => {
  it('should let the player report the dilemma and, as offensive, skip it', async () => {
    // Arrange
    const { connection, t } = await renderPhase();
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.open') }));
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.report') }));
    fireEvent.click(screen.getByRole('radio', { name: t('report.reasons.offensive') }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('report.send') }));
    fireEvent.click(screen.getByRole('button', { name: t('reportSent.skip') }));

    // Assert
    expect(connection.send).toHaveBeenCalledWith({
      type: 'report-dilemma',
      dilemmaId: 'test-dilemma-1',
      reason: 'offensive',
    });
    expect(connection.send).toHaveBeenLastCalledWith({
      type: 'skip-dilemma',
      dilemmaId: 'test-dilemma-1',
    });
    expect(screen.getByRole('heading', { name: 'Texto del dilema 2' })).toBeDefined();
  });

  it('should not offer to skip a dilemma reported for another reason', async () => {
    // Arrange
    const { t } = await renderPhase();
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.open') }));
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.report') }));
    fireEvent.click(screen.getByRole('radio', { name: t('report.reasons.confusing') }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('report.send') }));

    // Assert
    expect(screen.getByRole('status').textContent).toContain(t('reportSent.thanks'));
    expect(screen.queryByRole('button', { name: t('reportSent.skip') })).toBeNull();
  });

  it('should let only the host start the reveal, after confirming it', async () => {
    // Arrange
    const { connection, t } = await renderPhase();
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.open') }));
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.launchReveal') }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('launchReveal.launch') }));

    // Assert
    expect(connection.send).toHaveBeenLastCalledWith({ type: 'start-reveal' });
  });

  it('should not offer the reveal to a guest', async () => {
    // Arrange
    const { t } = await renderPhase(aGame({ hostId: 'test-luis-id' }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.open') }));

    // Assert
    expect(screen.queryByRole('button', { name: t('gameMenu.launchReveal') })).toBeNull();
    expect(screen.getByRole('button', { name: t('gameMenu.leave') })).toBeDefined();
  });

  it('should tell the player who becomes the host', async () => {
    // Arrange
    const { deliver, t } = await renderPhase(aGame({ hostId: 'test-luis-id' }));

    // Act
    act(() => deliver(aGame({ hostId: 'test-ana-id', gameVersion: 2 })));

    // Assert
    expect(screen.getByRole('status').textContent).toContain(t('newHost.title'));
  });

  it('should tell a straggler the time ran out', async () => {
    // Act
    const { t } = await renderPhase(aGame({ totalTimeRanOut: true, hostId: 'test-luis-id' }));

    // Assert
    expect(screen.getByRole('status').textContent).toContain(
      t('timeUp.straggler', { host: 'Luis' }),
    );
  });
});
