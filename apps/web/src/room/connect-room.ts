import type { RoomConnection } from './room-connection.ts';

/** In development, a simulated room in the browser; the screen is not connected to the room server yet. */
export async function connectRoom(): Promise<RoomConnection> {
  if (import.meta.env.DEV) {
    const [{ SimulatedRoomConnection }, { DEMO_ROOM }] = await Promise.all([
      import('./simulated-room-connection.ts'),
      import('./demo-room.ts'),
    ]);
    return SimulatedRoomConnection.open(DEMO_ROOM);
  }
  throw new Error('The screen is not connected to the room server yet');
}
