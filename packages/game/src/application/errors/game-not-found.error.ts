export class GameNotFoundError extends Error {
  constructor(gameId: string) {
    super(`game ${gameId} does not exist`);
    this.name = 'GameNotFoundError';
  }
}
