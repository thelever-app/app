import { DuplicateOptionError } from '../errors/duplicate-option.error.ts';
import { DuplicateTagError } from '../errors/duplicate-tag.error.ts';
import { OptionCountError } from '../errors/option-count.error.ts';
import { TagCountError } from '../errors/tag-count.error.ts';
import { type Category, CategoryVO } from './category.vo.ts';
import { IdVO } from './id.vo.ts';
import { type MinimumAge, MinimumAgeVO } from './minimum-age.vo.ts';
import { TagVO } from './tag.vo.ts';
import { TextVO } from './text.vo.ts';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 4;
const MAX_TAGS = 5;

function sameItems(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

/** What a player reads and the filter checks; changing any of it makes a new version. */
export interface VersionContent {
  readonly text: string;
  readonly options: readonly { readonly id: string; readonly text: string }[];
  readonly category: string;
  readonly tags: readonly string[];
  readonly minimumAge: number;
}

/** One version of a dilemma: its number and a content that never changes. */
export class VersionVO {
  readonly number: number;
  readonly #text: TextVO;
  readonly #options: readonly { readonly id: IdVO; readonly text: TextVO }[];
  readonly #category: CategoryVO;
  readonly #tags: readonly TagVO[];
  readonly #minimumAge: MinimumAgeVO;

  constructor(number: number, content: VersionContent) {
    const { length } = content.options;
    if (length < MIN_OPTIONS || length > MAX_OPTIONS) throw new OptionCountError(length);
    if (content.tags.length > MAX_TAGS) throw new TagCountError(content.tags.length);

    this.number = number;
    this.#text = new TextVO(content.text);
    this.#options = content.options.map((option) => ({
      id: new IdVO(option.id),
      text: new TextVO(option.text),
    }));
    this.#category = new CategoryVO(content.category);
    this.#tags = content.tags.map((tag) => new TagVO(tag));
    this.#minimumAge = new MinimumAgeVO(content.minimumAge);

    const optionIds = this.#options.map((option) => option.id.value);
    const repeatedId = optionIds.find((id, index) => optionIds.indexOf(id) !== index);
    if (repeatedId !== undefined) throw new DuplicateOptionError(repeatedId);
    const texts = this.#options.map((option) => option.text.value);
    const repeated = texts.find((text, index) => texts.indexOf(text) !== index);
    if (repeated !== undefined) throw new DuplicateOptionError(repeated);
    const tags = this.tags;
    const repeatedTag = tags.find((tag, index) => tags.indexOf(tag) !== index);
    if (repeatedTag !== undefined) throw new DuplicateTagError(repeatedTag);
  }

  get text(): string {
    return this.#text.value;
  }

  get options(): readonly { readonly id: string; readonly text: string }[] {
    return this.#options.map((option) => ({ id: option.id.value, text: option.text.value }));
  }

  get category(): Category {
    return this.#category.value;
  }

  get tags(): readonly string[] {
    return this.#tags.map((tag) => tag.value);
  }

  get minimumAge(): MinimumAge {
    return this.#minimumAge.value;
  }

  isSuitableForMinors(): boolean {
    return this.#minimumAge.isSuitableForMinors();
  }

  hasOption(optionId: string): boolean {
    return this.#options.some((option) => option.id.value === optionId);
  }

  /** The same content, whatever the number: nothing a player reads or the filter checks has changed. */
  hasSameContentAs(other: VersionVO): boolean {
    return (
      this.text === other.text &&
      this.category === other.category &&
      this.minimumAge === other.minimumAge &&
      sameItems(this.tags, other.tags) &&
      sameItems(
        this.options.map(({ id }) => id),
        other.options.map(({ id }) => id),
      ) &&
      sameItems(
        this.options.map(({ text }) => text),
        other.options.map(({ text }) => text),
      )
    );
  }
}
