export class DilemmaNotReportedAsOffensiveError extends Error {
  constructor(dilemmaId: string) {
    super(`dilemma ${dilemmaId} can only be skipped once reported as offensive`);
    this.name = 'DilemmaNotReportedAsOffensiveError';
  }
}
