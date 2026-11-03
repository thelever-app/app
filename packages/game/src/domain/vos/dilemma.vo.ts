import { InvalidDilemmaVersionError } from '../errors/invalid-dilemma-version.error.ts';
import { OptionsMissingError } from '../errors/options-missing.error.ts';
import { IdVO } from './id.vo.ts';

/**
 * A dilemma as the game knows it: its id, the version played and the ids of its options,
 * which is all its rules need. The text and the translations belong to the Dilemmas context.
 */
export class DilemmaVO {
  readonly #id: IdVO;
  readonly #version: number;
  readonly #optionIds: readonly IdVO[];

  constructor(dilemmaId: string, version: number, optionIds: readonly string[]) {
    this.#id = new IdVO(dilemmaId);
    if (!Number.isInteger(version) || version < 1) {
      throw new InvalidDilemmaVersionError(dilemmaId, version);
    }
    this.#version = version;
    if (optionIds.length === 0) throw new OptionsMissingError(dilemmaId);
    this.#optionIds = optionIds.map((optionId) => new IdVO(optionId));
  }

  get dilemmaId(): string {
    return this.#id.value;
  }

  /** The version the game plays, even if the dilemma gets a new one meanwhile. */
  get version(): number {
    return this.#version;
  }

  get optionIds(): readonly string[] {
    return this.#optionIds.map((optionId) => optionId.value);
  }

  hasOption(optionId: string): boolean {
    return this.optionIds.includes(optionId);
  }
}
