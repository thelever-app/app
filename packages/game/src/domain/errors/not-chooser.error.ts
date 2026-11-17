export class NotChooserError extends Error {
  constructor(playerId: string, roundId: number) {
    super(`player ${playerId} did not choose the dilemma of round ${roundId}`);
    this.name = 'NotChooserError';
  }
}
