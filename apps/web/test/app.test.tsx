import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GameStateDto, ServerMessageDto } from '@thelever-app/protocol';
import { App } from '../src/App.tsx';
import type { RoomConnection, ServerMessageListener } from '../src/room/room-connection.ts';
import { renderWithProviders } from './support/render.tsx';
import { aGame } from './support/game.ts';

function fakeConnection() {
  const listeners = new Set<ServerMessageListener>();
  const connection = {
    send: vi.fn(),
    subscribe: vi.fn((listener: ServerMessageListener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }),
    close: vi.fn(),
  } satisfies RoomConnection;
  const deliver = (message: ServerMessageDto) => {
    for (const listener of listeners) listener(message);
  };
  return { connection, deliver };
}

/** As the server sends it once Ana has answered all three: her answers and her progress. */
const allAnswered: GameStateDto = aGame({
  answers: [1, 2, 3].map((n) => ({ dilemmaId: `test-dilemma-${n}`, vote: `test-option-${n}a` })),
  players: [
    { playerId: 'test-ana-id', nickname: 'Ana', progress: 3 },
    { playerId: 'test-luis-id', nickname: 'Luis', progress: 1 },
  ],
});

async function renderApp() {
  const fake = fakeConnection();
  const { t } = await renderWithProviders(<App />, { connection: fake.connection });
  return { ...fake, t };
}

describe('App', () => {
  it('should say it is connecting until the game arrives', async () => {
    // Act
    const { t } = await renderApp();

    // Assert
    expect(screen.getByText(t('app.connecting'))).toBeDefined();
  });

  it('should show the next dilemma while the player has dilemmas to answer', async () => {
    // Arrange
    const { deliver } = await renderApp();

    // Act
    act(() => deliver(aGame()));

    // Assert
    expect(screen.getByRole('heading', { name: 'Texto del dilema 1' })).toBeDefined();
  });

  it('should send the answer to the room', async () => {
    // Arrange
    const { connection, deliver, t } = await renderApp();
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
    const { deliver, t } = await renderApp();

    // Act
    act(() => deliver(allAnswered));

    // Assert
    expect(screen.getByRole('heading', { name: t('waiting.title') })).toBeDefined();
  });

  it('should let the player review their answers from the first dilemma', async () => {
    // Arrange
    const { deliver, t } = await renderApp();
    act(() => deliver(allAnswered));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('waiting.review') }));

    // Assert
    expect(screen.getByRole('heading', { name: 'Texto del dilema 1' })).toBeDefined();
  });

  it('should come back to waiting after reviewing, sending nothing if no vote changed', async () => {
    // Arrange
    const { connection, deliver, t } = await renderApp();
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
});
