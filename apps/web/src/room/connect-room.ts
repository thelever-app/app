import type { RoomConnection } from './room-connection.ts';

/** In development, a simulated room in the browser; the room server arrives with TSK-24. */
export async function connectRoom(): Promise<RoomConnection> {
  if (import.meta.env.DEV) {
    const [{ SimulatedRoomConnection }, { DEMO_ROOM }] = await Promise.all([
      import('./simulated-room-connection.ts'),
      import('./demo-room.ts'),
    ]);
    return SimulatedRoomConnection.open(DEMO_ROOM);
  }
  throw new Error('The room server arrives with TSK-24');
}
