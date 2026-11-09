export class PlayerLeftGameError extends Error {
  constructor(playerId: string) {
    super(`player ${playerId} left the game`);
    this.name = 'PlayerLeftGameError';
  }
}
