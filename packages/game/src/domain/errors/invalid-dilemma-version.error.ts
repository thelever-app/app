export class InvalidDilemmaVersionError extends Error {
  constructor(dilemmaId: string, version: number) {
    super(`dilemma ${dilemmaId} cannot be at version ${version}`);
    this.name = 'InvalidDilemmaVersionError';
  }
}
