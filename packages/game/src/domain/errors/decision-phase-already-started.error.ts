export class DecisionPhaseAlreadyStartedError extends Error {
  constructor() {
    super('the game is already in the decision phase');
    this.name = 'DecisionPhaseAlreadyStartedError';
  }
}
