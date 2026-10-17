export class RoomNotFoundError extends Error {
  constructor(roomId: string) {
    super(`room ${roomId} does not exist`);
    this.name = 'RoomNotFoundError';
  }
}
