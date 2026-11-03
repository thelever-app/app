export class DilemmaNotFoundError extends Error {
  readonly dilemmaId: string;

  /** With a version, it is that version of the dilemma that does not exist. */
  constructor(dilemmaId: string, version?: number) {
    super(
      version === undefined
        ? `dilemma ${dilemmaId} does not exist`
        : `version ${version} of dilemma ${dilemmaId} does not exist`,
    );
    this.name = 'DilemmaNotFoundError';
    this.dilemmaId = dilemmaId;
  }
}
