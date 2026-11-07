export class DuplicateVotePredictionError extends Error {
  constructor(playerId: string) {
    super(`the vote of player ${playerId} is predicted twice`);
    this.name = 'DuplicateVotePredictionError';
  }
}
