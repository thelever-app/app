/** The room closed: every player left, or nobody was connected for a while. It lets nobody in. */
export class RoomClosedError extends Error {
  constructor(roomId: string) {
    super(`room ${roomId} is closed`);
    this.name = 'RoomClosedError';
  }
}
