export class RoundTakenError extends Error {
  constructor(roundId: number) {
    super(`a player has already chosen the dilemma of round ${roundId}`);
    this.name = 'RoundTakenError';
  }
}
