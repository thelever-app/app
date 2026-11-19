/** Nobody under 18 joins a room with dilemmas for adults. */
export class AdultsOnlyRoomError extends Error {
  constructor(roomId: string) {
    super(`room ${roomId} is only for people 18 or over`);
    this.name = 'AdultsOnlyRoomError';
  }
}
