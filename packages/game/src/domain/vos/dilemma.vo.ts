import { InvalidDilemmaVersionError } from '../errors/invalid-dilemma-version.error.ts';
import { OptionsMissingError } from '../errors/options-missing.error.ts';
import { IdVO } from './id.vo.ts';

/**
 * A dilemma as the game knows it: its id, the version played, the ids of its options and whether
 * its text has the gap "someone in the group", which is all its rules need. The text and the
 * translations belong to the Dilemmas context.
 */
export class DilemmaVO {
  readonly #id: IdVO;
  readonly #version: number;
  readonly #optionIds: readonly IdVO[];
  readonly #hasGap: boolean;

  constructor(dilemmaId: string, version: number, optionIds: readonly string[], hasGap = false) {
    this.#id = new IdVO(dilemmaId);
    if (!Number.isInteger(version) || version < 1) {
      throw new InvalidDilemmaVersionError(dilemmaId, version);
    }
    this.#version = version;
    if (optionIds.length === 0) throw new OptionsMissingError(dilemmaId);
    this.#optionIds = optionIds.map((optionId) => new IdVO(optionId));
    this.#hasGap = hasGap;
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

  /** Whether a player of the room takes the place of "someone in the group" in its text. */
  get hasGap(): boolean {
    return this.#hasGap;
  }

  hasOption(optionId: string): boolean {
    return this.optionIds.includes(optionId);
  }
}
