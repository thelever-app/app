export class GameRoundsOverError extends Error {
  constructor(gameId: string) {
    super(`the rounds of game ${gameId} are over`);
    this.name = 'GameRoundsOverError';
  }
}
