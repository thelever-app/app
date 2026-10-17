import { VoteMissingError } from '../errors/vote-missing.error.ts';

export class VoteVO {
  readonly value: string;

  /** Surrounding whitespace is dropped; a value made only of whitespace is missing. */
  constructor(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new VoteMissingError();
    }
    this.value = trimmed;
  }
}
