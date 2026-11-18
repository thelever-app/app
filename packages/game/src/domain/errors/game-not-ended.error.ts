export class GameNotEndedError extends Error {
  constructor(gameId: string) {
    super(`game ${gameId} has not ended`);
    this.name = 'GameNotEndedError';
  }
}
