export class PlayerNotInRoomError extends Error {
  constructor(playerId: string) {
    super(`player ${playerId} is not in the room`);
    this.name = 'PlayerNotInRoomError';
  }
}
