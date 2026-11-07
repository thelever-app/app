export class TooManyAddedDilemmasError extends Error {
  constructor(playerId: string, dilemmasPerPlayer: number) {
    super(`player ${playerId} has already added the ${dilemmasPerPlayer} dilemmas the room allows`);
    this.name = 'TooManyAddedDilemmasError';
  }
}
