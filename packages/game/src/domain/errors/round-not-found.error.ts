export class RoundNotFoundError extends Error {
  constructor(roundId: number) {
    super(`round ${roundId} is not in the room`);
    this.name = 'RoundNotFoundError';
  }
}
