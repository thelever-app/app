import type { GameStateDto } from '@thelever-app/protocol';
import { act, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RoomConnection } from '../../src/room/room-connection.ts';
import { RoomProvider, useRoom } from '../../src/room/room-provider.tsx';
import { SimulatedRoomConnection } from '../../src/room/simulated-room-connection.ts';
import { fakeConnection } from '../support/fake-connection.ts';

const GAME_STATE: GameStateDto = {
  type: 'game-state',
  gameId: 'test-game-id',
  gameVersion: 1,
  roomVersion: 3,
  playerId: 'test-player-id-0',
  dilemmas: [
    {
      dilemmaId: 'test-dilemma-id',
      text: 'TestText1',
      options: [
        { optionId: 'TestOptionA', text: 'TestOptionTextA' },
        { optionId: 'TestOptionB', text: 'TestOptionTextB' },
      ],
    },
  ],
  players: [
    {
      playerId: 'test-player-id-0',
      nickname: 'Ana',
      progress: 0,
      connected: true,
    },
    {
      playerId: 'test-player-id-1',
      nickname: 'Luis',
      progress: 0,
      connected: true,
    },
    {
      playerId: 'test-player-id-2',
      nickname: 'Natalia',
      progress: 0,
      connected: true,
    },
  ],
  answers: [],
};

function wrapperFor(connection: RoomConnection) {
  return ({ children }: { readonly children: ReactNode }) => {
    return (
      <RoomProvider connection={connection} fallback={null} rejected={() => null}>
        {children}
      </RoomProvider>
    );
  };
}

/** The provider with a fallback, a screen and what it shows when the room rejects the player. */
function renderProvider(connection: RoomConnection) {
  return render(
    <RoomProvider
      connection={connection}
      fallback={<p>TestConnecting</p>}
      rejected={(code) => <p>TestRejected {code}</p>}
    >
      <p>TestScreen</p>
    </RoomProvider>,
  );
}

describe('RoomProvider', () => {
  it('should show the fallback until the first game state arrives', () => {
    // Arrange
    const fake = fakeConnection();

    // Act
    renderProvider(fake.connection);

    // Assert
    expect(screen.getByText('TestConnecting')).toBeDefined();
    expect(screen.queryByText('TestScreen')).toBeNull();
  });

  it('should show its children instead of the fallback once the game state arrives', () => {
    // Arrange
    const fake = fakeConnection();
    renderProvider(fake.connection);

    // Act
    act(() => fake.deliver(GAME_STATE));

    // Assert
    expect(screen.getByText('TestScreen')).toBeDefined();
    expect(screen.queryByText('TestConnecting')).toBeNull();
  });

  it('should show why the room rejected the player instead of the fallback, before any game', () => {
    // Arrange
    const fake = fakeConnection('connecting');
    renderProvider(fake.connection);

    // Act
    act(() => {
      fake.deliver({ type: 'error', command: 'connect', code: 'game-not-found' });
      fake.changeStatus('rejected');
    });

    // Assert
    expect(screen.getByText('TestRejected game-not-found')).toBeDefined();
    expect(screen.queryByText('TestConnecting')).toBeNull();
  });

  it('should leave the screen for why the room rejected the player when it happens while playing', () => {
    // Arrange
    const fake = fakeConnection();
    renderProvider(fake.connection);
    act(() => fake.deliver(GAME_STATE));

    // Act
    act(() => {
      fake.deliver({ type: 'error', command: 'connect', code: 'game-not-found' });
      fake.changeStatus('rejected');
    });

    // Assert
    expect(screen.getByText('TestRejected game-not-found')).toBeDefined();
    expect(screen.queryByText('TestScreen')).toBeNull();
  });
});

describe('useRoom', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should throw an error if called outside a RoomProvider', () => {
    // Act & Assert
    expect(() => renderHook(() => useRoom())).toThrow('useRoom must be called inside RoomProvider');
  });

  it('should show the game state when it arrives', () => {
    // Arrange
    const fake = fakeConnection();
    const { result } = renderHook(() => useRoom(), { wrapper: wrapperFor(fake.connection) });

    // Act
    act(() => fake.deliver(GAME_STATE));

    // Assert
    expect(result.current.game).toBe(GAME_STATE);
  });

  it('should apply the progress of another player on top of the game', () => {
    // Arrange
    const fake = fakeConnection();
    const { result } = renderHook(() => useRoom(), { wrapper: wrapperFor(fake.connection) });
    act(() => fake.deliver(GAME_STATE));

    // Act
    act(() =>
      fake.deliver({
        type: 'progress-updated',
        gameVersion: 2,
        playerId: 'test-player-id-1',
        progress: 1,
      }),
    );

    // Assert
    expect(result.current.game.players.map(({ progress }) => progress)).toEqual([0, 1, 0]);
  });

  it('should show what the server rejected until the player dismisses it', () => {
    // Arrange
    const fake = fakeConnection();
    const { result } = renderHook(() => useRoom(), { wrapper: wrapperFor(fake.connection) });
    act(() => fake.deliver(GAME_STATE));

    // Act
    act(() =>
      fake.deliver({ type: 'error', command: 'answer-dilemma', code: 'dilemma-not-reached' }),
    );
    const shown = result.current.rejection;
    act(() => result.current.dismissRejection());

    // Assert
    expect(shown?.code).toBe('dilemma-not-reached');
    expect(result.current.rejection).toBeUndefined();
  });

  it('should share how the link to the room is doing, and every change of it', () => {
    // Arrange
    const fake = fakeConnection('connecting');
    const { result } = renderHook(() => useRoom(), { wrapper: wrapperFor(fake.connection) });
    act(() => fake.deliver(GAME_STATE));
    const first = result.current.status;

    // Act
    act(() => fake.changeStatus('reconnecting'));

    // Assert
    expect(first).toBe('connecting');
    expect(result.current.status).toBe('reconnecting');
  });

  it('should subscribe once, however many times it renders', () => {
    // Arrange
    const fake = fakeConnection();
    const { rerender } = renderHook(() => useRoom(), {
      wrapper: wrapperFor(fake.connection),
    });
    act(() => fake.deliver(GAME_STATE));

    // Act
    rerender();
    rerender();

    // Assert
    expect(fake.connection.subscribe).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe once when it unmounts', () => {
    // Arrange
    const fake = fakeConnection();
    const { unmount } = renderHook(() => useRoom(), {
      wrapper: wrapperFor(fake.connection),
    });

    // Act
    unmount();

    // Assert
    expect(fake.listeners.size).toBe(0);
  });

  it('should leave a single live subscription in strict mode', () => {
    // Arrange
    const fake = fakeConnection();
    const { result } = renderHook(() => useRoom(), {
      wrapper: wrapperFor(fake.connection),
      reactStrictMode: true,
    });

    // Act
    act(() => fake.deliver(GAME_STATE));

    // Assert
    expect(fake.connection.subscribe).toHaveBeenCalledTimes(2);
    expect(fake.listeners.size).toBe(1);
    expect(result.current.game).toBe(GAME_STATE);
  });

  it('should send the answer to the room', () => {
    // Arrange
    const fake = fakeConnection();
    const { result } = renderHook(() => useRoom(), { wrapper: wrapperFor(fake.connection) });
    act(() => fake.deliver(GAME_STATE));

    // Act
    result.current.answerDilemma('TestDilemma1', 'TestOption');

    // Assert
    expect(fake.connection.send).toHaveBeenCalledWith({
      type: 'answer-dilemma',
      dilemmaId: 'TestDilemma1',
      vote: 'TestOption',
    });
  });

  it('should keep the same answerDilemma across renders', () => {
    // Arrange
    const fake = fakeConnection();
    const { result, rerender } = renderHook(() => useRoom(), {
      wrapper: wrapperFor(fake.connection),
    });
    act(() => fake.deliver(GAME_STATE));
    const first = result.current.answerDilemma;

    // Act
    rerender();

    // Assert
    expect(result.current.answerDilemma).toBe(first);
  });

  it('should follow a simulated room as its fake players answer', async () => {
    // Arrange
    vi.useFakeTimers();
    const connection = await SimulatedRoomConnection.open({
      nickname: 'Ana',
      language: 'es',
      others: [{ nickname: 'Luis', answerEveryMs: 1000 }],
      dilemmas: [
        { text: 'TestText1', options: ['TestOptionA', 'TestOptionB'] },
        { text: 'TestText2', options: ['TestOptionC', 'TestOptionD'] },
      ],
    });
    const { result } = renderHook(() => useRoom(), { wrapper: wrapperFor(connection) });
    await act(() => vi.advanceTimersByTimeAsync(0));

    // Act
    await act(() => vi.advanceTimersByTimeAsync(1000));

    // Assert
    expect(result.current.game.players.map(({ progress }) => progress)).toEqual([0, 1]);
    connection.close();
  });
});
