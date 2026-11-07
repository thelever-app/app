export class GameInProgressError extends Error {
  constructor(roomId: string) {
    super(`room ${roomId} already has a game in progress`);
    this.name = 'GameInProgressError';
  }
}
