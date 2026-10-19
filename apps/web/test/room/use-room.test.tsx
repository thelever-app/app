import type { GameStateDto, ServerMessageDto } from '@thelever-app/protocol';
import type { RoomConnection, ServerMessageListener } from '../../src/room/room-connection.ts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { RoomConnectionProvider } from '../../src/room/room-context.tsx';
import { SimulatedRoomConnection } from '../../src/room/simulated-room-connection.ts';
import { renderHook, act } from '@testing-library/react';
import { useRoom } from '../../src/room/use-room.ts';

const GAME_STATE: GameStateDto = {
  type: 'game-state',
  gameId: 'test-game-id',
  playerId: 'test-player-id-0',
  dilemmaIds: ['test-dilemma-id'],
  players: [
    {
      playerId: 'test-player-id-0',
      nickname: 'Ana',
      progress: 0,
    },
    {
      playerId: 'test-player-id-1',
      nickname: 'Luis',
      progress: 0,
    },
    {
      playerId: 'test-player-id-2',
      nickname: 'Natalia',
      progress: 0,
    },
  ],
  answers: [],
};

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

  const deliver = (message: ServerMessageDto) => listeners.forEach((listener) => listener(message));
  return { connection, deliver, listeners };
}

function wrapperFor(connection: RoomConnection) {
  return ({ children }: { readonly children: ReactNode }) => {
    return <RoomConnectionProvider connection={connection}>{children}</RoomConnectionProvider>;
  };
}

describe('useRoom', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should have no game before the first message arrives', () => {
    // Arrange
    const fake = fakeConnection();

    // Act
    const { result } = renderHook(() => useRoom(), { wrapper: wrapperFor(fake.connection) });

    // Assert
    expect(result.current.game).toBeUndefined();
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
      fake.deliver({ type: 'progress-updated', playerId: 'test-player-id-1', progress: 1 }),
    );

    // Assert
    expect(result.current.game?.players.map(({ progress }) => progress)).toEqual([0, 1, 0]);
  });

  it('should subscribe once, however many times it renders', () => {
    // Arrange
    const fake = fakeConnection();
    const { rerender } = renderHook(() => useRoom(), {
      wrapper: wrapperFor(fake.connection),
    });

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
      others: [{ nickname: 'Luis', answerEveryMs: 1000 }],
      dilemmaIds: ['TestDilemma1', 'TestDilemma2'],
      vote: 'TestOption',
    });
    const { result } = renderHook(() => useRoom(), { wrapper: wrapperFor(connection) });
    await act(() => vi.advanceTimersByTimeAsync(0));

    // Act
    await act(() => vi.advanceTimersByTimeAsync(1000));

    // Assert
    expect(result.current.game?.players.map(({ progress }) => progress)).toEqual([0, 1]);
    connection.close();
  });
});
