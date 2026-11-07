export class NotEnoughPlayersError extends Error {
  constructor(minimum: number) {
    super(`a game needs at least ${minimum} players`);
    this.name = 'NotEnoughPlayersError';
  }
}
