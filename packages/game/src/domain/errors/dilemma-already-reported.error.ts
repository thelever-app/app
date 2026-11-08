export class DilemmaAlreadyReportedError extends Error {
  constructor(dilemmaId: string) {
    super(`the player already reported dilemma ${dilemmaId}`);
    this.name = 'DilemmaAlreadyReportedError';
  }
}
