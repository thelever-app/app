import { DuplicateOptionError } from '../errors/duplicate-option.error.ts';
import { OptionCountError } from '../errors/option-count.error.ts';
import type { IdGenerator } from '../ports/id-generator.port.ts';
import { IdVO } from '../vos/id.vo.ts';
import { LanguageVO } from '../vos/language.vo.ts';
import { TextVO } from '../vos/text.vo.ts';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 4;

export interface OptionSnapshot {
  readonly id: string;
  readonly text: string;
}

export interface DilemmaSnapshot {
  readonly id: string;
  readonly text: string;
  /** The language the dilemma was written in. */
  readonly language: string;
  readonly options: readonly OptionSnapshot[];
}

/** What a player reads: the text and the options, in one language. */
export interface DilemmaContent {
  readonly text: string;
  readonly options: readonly OptionSnapshot[];
}

export class Dilemma {
  readonly #id: IdVO;
  readonly #text: TextVO;
  readonly #language: LanguageVO;
  readonly #options: readonly { readonly id: IdVO; readonly text: TextVO }[];

  private constructor(snapshot: DilemmaSnapshot) {
    const { length } = snapshot.options;
    if (length < MIN_OPTIONS || length > MAX_OPTIONS) throw new OptionCountError(length);

    this.#id = new IdVO(snapshot.id);
    this.#text = new TextVO(snapshot.text);
    this.#language = new LanguageVO(snapshot.language);
    this.#options = snapshot.options.map((option) => ({
      id: new IdVO(option.id),
      text: new TextVO(option.text),
    }));

    const texts = this.#options.map((option) => option.text.value);
    const repeated = texts.find((text, index) => texts.indexOf(text) !== index);
    if (repeated !== undefined) throw new DuplicateOptionError(repeated);
  }

  static create(
    {
      text,
      language,
      options,
    }: { readonly text: string; readonly language: string; readonly options: readonly string[] },
    idGenerator: IdGenerator,
  ): Dilemma {
    const id = idGenerator.generate();
    return new Dilemma({
      id,
      text,
      language,
      options: options.map((option) => ({ id: idGenerator.generate(), text: option })),
    });
  }

  get id(): string {
    return this.#id.value;
  }

  get text(): string {
    return this.#text.value;
  }

  get language(): string {
    return this.#language.value;
  }

  get options(): readonly OptionSnapshot[] {
    return this.#options.map((option) => ({ id: option.id.value, text: option.text.value }));
  }

  /** The content in the language asked for, or in the original language while there is no translation. */
  contentIn(language: string): DilemmaContent {
    new LanguageVO(language);
    return { text: this.text, options: this.options };
  }

  toSnapshot(): DilemmaSnapshot {
    return { id: this.id, text: this.text, language: this.language, options: this.options };
  }

  static restore(snapshot: DilemmaSnapshot): Dilemma {
    return new Dilemma(snapshot);
  }
}
