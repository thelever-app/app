export class AlreadyVotedError extends Error {
  constructor(dilemmaId: string, version: number) {
    super(`this identity already voted version ${version} of dilemma ${dilemmaId} alone`);
    this.name = 'AlreadyVotedError';
  }
}
