import type { GameStateDto } from '@thelever-app/protocol';
import { act, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RoomConnection } from '../../src/room/room-connection.ts';
import { RoomProvider, useGame, useLobby, useRoom } from '../../src/room/room-provider.tsx';
import { SimulatedRoomConnection } from '../../src/room/simulated-room-connection.ts';
import { fakeConnection } from '../support/fake-connection.ts';
import { aRoom } from '../support/room.ts';

const GAME_STATE: GameStateDto = {
  type: 'game-state',
  gameId: 'test-game-id',
  gameVersion: 1,
  roomVersion: 3,
  playerId: 'test-player-id-0',
  phase: 'decision',
  hostId: 'test-player-id-0',
  totalTimeEndsAt: '2026-11-09T10:06:00.000Z',
  serverTime: '2026-11-09T10:00:00.000Z',
  totalTimeRanOut: false,
  dilemmas: [
    {
      dilemmaId: 'test-dilemma-id',
      predictionSubset: [],
      personInTheGap: null,
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
      avatar: { face: 'face-01', color: 'teal' },
      progress: 0,
      connected: true,
      left: false,
    },
    {
      playerId: 'test-player-id-1',
      nickname: 'Luis',
      avatar: { face: 'face-02', color: 'rust' },
      progress: 0,
      connected: true,
      left: false,
    },
    {
      playerId: 'test-player-id-2',
      nickname: 'Natalia',
      avatar: { face: 'face-03', color: 'olive' },
      progress: 0,
      connected: true,
      left: false,
    },
  ],
  answers: [],
  reports: [],
  didNotVote: [],
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

  it('should show its children once the lobby arrives', () => {
    // Arrange
    const fake = fakeConnection();
    renderProvider(fake.connection);

    // Act
    act(() => fake.deliver(aRoom()));

    // Assert
    expect(screen.getByText('TestScreen')).toBeDefined();
  });

  it('should show that the host expelled the player when the room gives up on them', () => {
    // Arrange
    const fake = fakeConnection();
    renderProvider(fake.connection);
    act(() => fake.deliver(aRoom()));

    // Act
    act(() => {
      fake.deliver({ type: 'expelled' });
      fake.changeStatus('rejected');
    });

    // Assert
    expect(screen.getByText('TestRejected player-expelled')).toBeDefined();
  });
});

describe('useGame and useLobby', () => {
  it('should give the game to a screen of the game', () => {
    // Arrange
    const fake = fakeConnection();
    const { result } = renderHook(() => useGame(), { wrapper: wrapperFor(fake.connection) });

    // Act
    act(() => fake.deliver(GAME_STATE));

    // Assert
    expect(result.current.game).toBe(GAME_STATE);
  });

  it('should give the lobby to a screen of the lobby', () => {
    // Arrange
    const fake = fakeConnection();
    const lobby = aRoom();
    const { result } = renderHook(() => useLobby(), { wrapper: wrapperFor(fake.connection) });

    // Act
    act(() => fake.deliver(lobby));

    // Assert
    expect(result.current.lobby).toBe(lobby);
  });

  it('should throw when the screen of the game shows in the lobby', () => {
    // Arrange
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fake = fakeConnection();
    renderHook(() => useGame(), { wrapper: wrapperFor(fake.connection) });

    // Act & Assert
    expect(() => act(() => fake.deliver(aRoom()))).toThrow(
      'useGame must be called while the player has a game',
    );
    vi.restoreAllMocks();
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
    expect(result.current.game?.players.map(({ progress }) => progress)).toEqual([0, 1, 0]);
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
    result.current.answerDilemma({ dilemmaId: 'TestDilemma1', vote: 'TestOption' });

    // Assert
    expect(fake.connection.send).toHaveBeenCalledWith({
      type: 'answer-dilemma',
      dilemmaId: 'TestDilemma1',
      vote: 'TestOption',
    });
  });

  it('should send a command of the lobby to the room', () => {
    // Arrange
    const fake = fakeConnection();
    const { result } = renderHook(() => useRoom(), { wrapper: wrapperFor(fake.connection) });
    act(() => fake.deliver(aRoom()));

    // Act
    result.current.send({ type: 'expel-player', playerId: 'test-marta-id' });

    // Assert
    expect(fake.connection.send).toHaveBeenCalledWith({
      type: 'expel-player',
      playerId: 'test-marta-id',
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

  it('should follow a simulated room from its lobby to the game', async () => {
    // Arrange
    vi.useFakeTimers();
    const connection = await SimulatedRoomConnection.open({
      nickname: 'Ana',
      language: 'es',
      others: [
        { nickname: 'Luis', joinAfterMs: 10, answerEveryMs: 1000 },
        { nickname: 'Marta', joinAfterMs: 10, answerEveryMs: 1000 },
      ],
      dilemmas: [
        { text: 'TestText1', options: ['TestOptionA', 'TestOptionB'] },
        { text: 'TestText2', options: ['TestOptionC', 'TestOptionD'] },
      ],
    });
    const { result } = renderHook(() => useRoom(), { wrapper: wrapperFor(connection) });
    await act(() => vi.advanceTimersByTimeAsync(10));
    const playersInTheLobby = result.current.lobby?.players.length;

    // Act
    act(() => result.current.send({ type: 'start-game' }));
    await act(() => vi.advanceTimersByTimeAsync(1000));

    // Assert
    expect(playersInTheLobby).toBe(3);
    expect(result.current.game?.players.map(({ progress }) => progress)).toEqual([0, 1, 1]);
    connection.close();
  });
});
