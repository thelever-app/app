export class DecisionPhaseNotStartedError extends Error {
  constructor() {
    super('the game is not in the decision phase');
    this.name = 'DecisionPhaseNotStartedError';
  }
}
