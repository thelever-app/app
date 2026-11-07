export class RoomFullError extends Error {
  constructor(roomId: string) {
    super(`room ${roomId} is full`);
    this.name = 'RoomFullError';
  }
}
