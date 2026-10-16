import { VoteMissingError } from '../errors/vote-missing.error.ts';

export class VoteVO {
  readonly value: string;

  constructor(value: string) {
    if (!value) {
      throw new VoteMissingError();
    }
    this.value = value;
  }
}
