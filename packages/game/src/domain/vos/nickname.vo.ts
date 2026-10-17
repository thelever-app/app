import { NicknameMissingError } from '../errors/nickname-missing.error.ts';

export class NicknameVO {
  readonly value: string;

  /** Surrounding whitespace is dropped; a value made only of whitespace is missing. */
  constructor(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new NicknameMissingError();
    }
    this.value = trimmed;
  }
}
