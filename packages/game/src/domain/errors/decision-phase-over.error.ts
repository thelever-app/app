export class DecisionPhaseOverError extends Error {
  constructor() {
    super('the decision phase is over: the game is in the reveal');
    this.name = 'DecisionPhaseOverError';
  }
}
