import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RoomNotices } from '../../src/components/room-notices.tsx';
import { fakeConnection } from '../support/fake-connection.ts';
import { aGame } from '../support/game.ts';
import { renderWithProviders } from '../support/render.tsx';

/** The notices of a room that has already sent its first state. */
async function renderNotices() {
  const fake = fakeConnection();
  const rendered = await renderWithProviders(<RoomNotices />, { connection: fake.connection });
  act(() => fake.deliver(aGame()));
  return { ...fake, ...rendered };
}

describe('RoomNotices', () => {
  it('should show nothing while the room is connected and nothing was rejected', async () => {
    // Act
    await renderNotices();

    // Assert
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('should show the reconnecting bar while the link to the room is down, and hide it after', async () => {
    // Arrange
    const { changeStatus, t } = await renderNotices();

    // Act
    act(() => changeStatus('reconnecting'));
    const whileDown = screen.queryByRole('status')?.textContent;
    act(() => changeStatus('connected'));

    // Assert
    expect(whileDown).toBe(t('notices.reconnecting'));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('should show that the answer was not saved until the player dismisses it', async () => {
    // Arrange
    const { deliver, t } = await renderNotices();
    act(() => deliver({ type: 'error', command: 'answer-dilemma', code: 'dilemma-not-reached' }));
    const shown = screen.queryByRole('alert')?.textContent;

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('notices.dismiss') }));

    // Assert
    expect(shown).toContain(t('notices.answerNotSaved'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('should not say an answer was not saved when what the room rejected was the connection', async () => {
    // Arrange
    const { deliver } = await renderNotices();

    // Act
    act(() => deliver({ type: 'error', command: 'connect', code: 'invalid-token' }));

    // Assert
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
