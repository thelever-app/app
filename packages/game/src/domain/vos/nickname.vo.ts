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

  /** Two nicknames are the same when they match without counting case or accents. */
  sameAs(other: NicknameVO): boolean {
    return folded(this.value) === folded(other.value);
  }
}

function folded(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}
