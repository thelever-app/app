/** No player of the game has the identity of whoever tries to connect. The identity is not in the message, to keep it out of the logs. */
export class IdentityNotInGameError extends Error {
  constructor(gameId: string) {
    super(`nobody with that identity plays game ${gameId}`);
    this.name = 'IdentityNotInGameError';
  }
}
