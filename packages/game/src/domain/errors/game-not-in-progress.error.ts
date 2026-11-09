export class GameNotInProgressError extends Error {
  constructor(roomId: string) {
    super(`room ${roomId} has no game in progress`);
    this.name = 'GameNotInProgressError';
  }
}
