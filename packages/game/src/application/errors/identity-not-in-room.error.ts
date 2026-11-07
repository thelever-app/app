/** No player of the room has the identity of whoever tries to connect. The identity is not in the message, to keep it out of the logs. */
export class IdentityNotInRoomError extends Error {
  constructor(roomId: string) {
    super(`nobody with that identity is in room ${roomId}`);
    this.name = 'IdentityNotInRoomError';
  }
}
