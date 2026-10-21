import { describe, expect, it } from 'vitest';
import type { ServerMessageDto } from '@thelever-app/protocol';
import { DEMO_ROOM } from '../../src/room/demo-room.ts';
import { SimulatedRoomConnection } from '../../src/room/simulated-room-connection.ts';

describe('DEMO_ROOM', () => {
  it('should open a room with every demo dilemma and every player', async () => {
    // Arrange
    const connection = await SimulatedRoomConnection.open(DEMO_ROOM);
    const received: ServerMessageDto[] = [];

    // Act
    connection.subscribe((message) => received.push(message));
    await new Promise((resolve) => setTimeout(resolve, 0));
    connection.close();

    // Assert
    const [state] = received;
    expect(state?.type === 'game-state' && state.dilemmas.length).toBe(DEMO_ROOM.dilemmas.length);
    expect(state?.type === 'game-state' && state.players.length).toBe(DEMO_ROOM.others.length + 1);
  });
});
