import { InvalidLanguageError } from '../errors/invalid-language.error.ts';

/** A language code such as `es`, optionally with a region such as `pt-BR`. */
export class LanguageVO {
  static readonly #FORMAT = /^[a-z]{2}(-[A-Z]{2})?$/;

  readonly value: string;

  constructor(value: string) {
    if (!LanguageVO.#FORMAT.test(value)) {
      throw new InvalidLanguageError(value);
    }
    this.value = value;
  }
}
