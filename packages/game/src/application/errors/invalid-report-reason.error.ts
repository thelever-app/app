export class InvalidReportReasonError extends Error {
  constructor(reason: string) {
    super(`"${reason}" is not a reason to report a dilemma`);
    this.name = 'InvalidReportReasonError';
  }
}
