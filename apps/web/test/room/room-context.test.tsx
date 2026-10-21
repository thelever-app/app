import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { RoomConnection } from '../../src/room/room-connection.ts';
import { RoomConnectionProvider, useRoomConnection } from '../../src/room/room-context.tsx';

function fakeConnection(): RoomConnection {
  return { send: vi.fn(), subscribe: vi.fn(() => () => {}), close: vi.fn() };
}

describe('useRoomConnection', () => {
  it('should return the connection of the provider', () => {
    // Arrange
    const connection = fakeConnection();
    const wrapper = ({ children }: { readonly children: ReactNode }) => (
      <RoomConnectionProvider connection={connection}>{children}</RoomConnectionProvider>
    );

    // Act
    const { result } = renderHook(() => useRoomConnection(), { wrapper });

    // Assert
    expect(result.current).toBe(connection);
  });

  it('should throw an error if called outside a provider', () => {
    // Act & Assert
    expect(() => renderHook(() => useRoomConnection())).toThrow(
      'useRoomConnection must be called inside RoomConnectionProvider',
    );
  });

  it('should reach a component nested deep below the provider, with no props', () => {
    // Arrange
    const connection = fakeConnection();
    function AnswerButton() {
      const room = useRoomConnection();
      return (
        <button
          type="button"
          onClick={() =>
            room.send({ type: 'answer-dilemma', dilemmaId: 'TestDilemma1', vote: 'TestOption' })
          }
        >
          Responder
        </button>
      );
    }
    render(
      <RoomConnectionProvider connection={connection}>
        <section>
          <div>
            <AnswerButton />
          </div>
        </section>
      </RoomConnectionProvider>,
    );

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Responder' }));

    // Assert
    expect(connection.send).toHaveBeenCalledWith({
      type: 'answer-dilemma',
      dilemmaId: 'TestDilemma1',
      vote: 'TestOption',
    });
  });
});
