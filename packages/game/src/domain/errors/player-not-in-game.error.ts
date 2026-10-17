export class PlayerNotInGameError extends Error {
  constructor(playerId: string) {
    super(`player ${playerId} is not in the game`);
    this.name = 'PlayerNotInGameError';
  }
}
