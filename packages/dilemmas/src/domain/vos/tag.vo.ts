import { TagMissingError } from '../errors/tag-missing.error.ts';
import { TagTooLongError } from '../errors/tag-too-long.error.ts';

/** A free word in the language of the dilemma. */
export class TagVO {
  static readonly #MAX_LENGTH = 30;

  readonly value: string;

  /** Stored in lowercase and without surrounding whitespace, so the same tag is never written twice. */
  constructor(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      throw new TagMissingError();
    }
    if (normalized.length > TagVO.#MAX_LENGTH) {
      throw new TagTooLongError(normalized, TagVO.#MAX_LENGTH);
    }
    this.value = normalized;
  }
}
