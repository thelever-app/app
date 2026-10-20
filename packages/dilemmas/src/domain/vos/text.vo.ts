import { TextMissingError } from '../errors/text-missing.error.ts';

/** The text of a dilemma or of an option. */
export class TextVO {
  readonly value: string;

  /** Surrounding whitespace is dropped; a value made only of whitespace is missing. */
  constructor(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new TextMissingError();
    }
    this.value = trimmed;
  }
}
