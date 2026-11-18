export class NoVoteToReactToError extends Error {
  constructor(playerId: string, dilemmaId: string) {
    super(`there is no vote of ${playerId} in the dilemma ${dilemmaId} to react to`);
    this.name = 'NoVoteToReactToError';
  }
}
