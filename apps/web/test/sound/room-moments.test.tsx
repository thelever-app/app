import type { ServerMessageDto } from '@thelever-app/protocol';
import { act, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { RoomProvider } from '../../src/room/room-provider.tsx';
import { RoomMoments } from '../../src/sound/room-moments.tsx';
import { SoundProvider } from '../../src/sound/sound-context.tsx';
import { soundPreference } from '../../src/sound/sound-preference.ts';
import { fakeConnection } from '../support/fake-connection.ts';
import { aGame } from '../support/game.ts';
import { aRoom } from '../support/room.ts';

/** The room as the screen follows it, with what the sound of the game was asked to play. */
function renderRoom(first: ServerMessageDto) {
  const fake = fakeConnection();
  const play = vi.fn();
  const view = render(
    <StrictMode>
      <SoundProvider effects={{ play }} preference={soundPreference()}>
        <RoomProvider connection={fake.connection} fallback={null} rejected={() => null}>
          <RoomMoments />
        </RoomProvider>
      </SoundProvider>
    </StrictMode>,
  );
  act(() => fake.deliver(first));
  return {
    ...view,
    play,
    deliver: (message: ServerMessageDto) => act(() => fake.deliver(message)),
  };
}

describe('RoomMoments', () => {
  it('should play nothing for the room as it was when the screen opened', () => {
    // Act
    const { play } = renderRoom(aRoom());

    // Assert
    expect(play).not.toHaveBeenCalled();
  });

  it('should play a player joining the lobby, once', () => {
    // Arrange
    const room = aRoom();
    const { play, deliver } = renderRoom(room);
    const pablo = {
      playerId: 'test-pablo-id',
      nickname: 'Pablo',
      avatar: { face: 'face-04', color: 'olive' },
      connected: true,
    } as const;

    // Act
    deliver(aRoom({ roomVersion: room.roomVersion + 1, players: [...room.players, pablo] }));

    // Assert
    expect(play.mock.calls).toEqual([['player-joined']]);
  });

  it('should play the game starting when the lobby gives way to the game', () => {
    // Arrange
    const room = aRoom();
    const { play, deliver } = renderRoom(room);

    // Act
    deliver(aGame({ roomVersion: room.roomVersion + 1 }));

    // Assert
    expect(play.mock.calls).toEqual([['game-started']]);
  });

  it('should play nothing when the room sends the same state again', () => {
    // Arrange
    const room = aRoom();
    const { play, deliver, rerender } = renderRoom(room);

    // Act
    deliver({ ...room, roomVersion: room.roomVersion + 1 });
    rerender(<></>);

    // Assert
    expect(play).not.toHaveBeenCalled();
  });
});
