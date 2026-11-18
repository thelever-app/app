export class PersonInTheGapVotesError extends Error {
  constructor(dilemmaId: string) {
    super(`the person in the gap of dilemma ${dilemmaId} does not vote it: they only predict`);
    this.name = 'PersonInTheGapVotesError';
  }
}
