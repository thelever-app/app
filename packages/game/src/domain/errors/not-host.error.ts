export class NotHostError extends Error {
  constructor(playerId: string) {
    super(`player ${playerId} is not the host of the room`);
    this.name = 'NotHostError';
  }
}
