import { TextVO } from './text.vo.ts';

/** What the public web tells of a dilemma: an optional context and, for each option, an argument for it and one against it. */
export interface ArgumentsSnapshot {
  readonly context?: string;
  readonly options: readonly {
    readonly optionId: string;
    readonly for: string;
    readonly against: string;
  }[];
}

/** The arguments of one version; the dilemma checks they are one for each of its options. */
export class ArgumentsVO {
  readonly #context: TextVO | undefined;
  readonly #options: readonly {
    readonly optionId: string;
    readonly for: TextVO;
    readonly against: TextVO;
  }[];

  constructor(snapshot: ArgumentsSnapshot) {
    this.#context = snapshot.context === undefined ? undefined : new TextVO(snapshot.context);
    this.#options = snapshot.options.map((option) => ({
      optionId: option.optionId,
      for: new TextVO(option.for),
      against: new TextVO(option.against),
    }));
  }

  /** Whether there is exactly one entry for each of those options, in any order. */
  coversExactly(optionIds: readonly string[]): boolean {
    const argued = this.#options.map(({ optionId }) => optionId);
    return (
      argued.length === optionIds.length &&
      new Set(argued).size === argued.length &&
      optionIds.every((id) => argued.includes(id))
    );
  }

  toSnapshot(): ArgumentsSnapshot {
    const options = this.#options.map((option) => ({
      optionId: option.optionId,
      for: option.for.value,
      against: option.against.value,
    }));
    return this.#context === undefined ? { options } : { context: this.#context.value, options };
  }
}
