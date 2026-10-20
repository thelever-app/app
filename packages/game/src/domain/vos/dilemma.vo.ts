import { OptionsMissingError } from '../errors/options-missing.error.ts';
import { IdVO } from './id.vo.ts';

/**
 * A dilemma as the game knows it: its id and the ids of its options, which is all its rules need.
 * The text and the translations belong to the Dilemmas context.
 */
export class DilemmaVO {
  readonly #id: IdVO;
  readonly #optionIds: readonly IdVO[];

  constructor(dilemmaId: string, optionIds: readonly string[]) {
    this.#id = new IdVO(dilemmaId);
    if (optionIds.length === 0) throw new OptionsMissingError(dilemmaId);
    this.#optionIds = optionIds.map((optionId) => new IdVO(optionId));
  }

  get dilemmaId(): string {
    return this.#id.value;
  }

  get optionIds(): readonly string[] {
    return this.#optionIds.map((optionId) => optionId.value);
  }

  hasOption(optionId: string): boolean {
    return this.optionIds.includes(optionId);
  }
}
