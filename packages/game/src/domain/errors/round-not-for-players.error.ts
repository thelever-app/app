export class RoundNotForPlayersError extends Error {
  constructor(roundId: number) {
    super(`the players do not choose the dilemma of round ${roundId}`);
    this.name = 'RoundNotForPlayersError';
  }
}
