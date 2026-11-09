export class DilemmaNotRevealedError extends Error {
  constructor(position: number) {
    super(`the dilemma of round ${position} has not been revealed`);
    this.name = 'DilemmaNotRevealedError';
  }
}
