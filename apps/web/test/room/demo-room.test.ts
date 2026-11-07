import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ServerMessageDto } from '@thelever-app/protocol';
import { DEMO_ROOM } from '../../src/room/demo-room.ts';
import { SimulatedRoomConnection } from '../../src/room/simulated-room-connection.ts';

describe('DEMO_ROOM', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should open a lobby every fake player joins, and a game with the seed dilemmas of its category', async () => {
    // Arrange
    vi.useFakeTimers();
    const connection = await SimulatedRoomConnection.open(DEMO_ROOM);
    const received: ServerMessageDto[] = [];
    connection.subscribe((message) => received.push(message));
    const lastJoins = Math.max(...DEMO_ROOM.others.map(({ joinAfterMs }) => joinAfterMs));
    await vi.advanceTimersByTimeAsync(lastJoins);

    // Act
    connection.send({ type: 'start-game' });
    await vi.advanceTimersByTimeAsync(0);
    connection.close();

    // Assert
    const lobby = received.filter((message) => message.type === 'room-state').at(-1);
    const game = received.find((message) => message.type === 'game-state');
    expect(lobby?.players).toHaveLength(DEMO_ROOM.others.length + 1);
    // The seed has three dilemmas of life and death, the category a room starts with.
    expect(game?.dilemmas).toHaveLength(3);
  });
});
