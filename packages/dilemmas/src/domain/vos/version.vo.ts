import { DuplicateOptionError } from '../errors/duplicate-option.error.ts';
import { DuplicateTagError } from '../errors/duplicate-tag.error.ts';
import { OptionCountError } from '../errors/option-count.error.ts';
import { TagCountError } from '../errors/tag-count.error.ts';
import { type Category, CategoryVO } from './category.vo.ts';
import { type DilemmaType, DilemmaTypeVO } from './dilemma-type.vo.ts';
import { IdVO } from './id.vo.ts';
import { type MinimumAge, MinimumAgeVO } from './minimum-age.vo.ts';
import { type Scale, ScaleVO } from './scale.vo.ts';
import { TagVO } from './tag.vo.ts';
import { TextVO } from './text.vo.ts';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 4;
const MAX_TAGS = 5;

function sameItems(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

/**
 * What a player reads and the filter checks, and how the dilemma is classified to put games
 * together; changing any of it makes a new version.
 */
export interface VersionContent {
  readonly text: string;
  readonly options: readonly { readonly id: string; readonly text: string }[];
  readonly category: string;
  readonly tags: readonly string[];
  readonly minimumAge: number;
  readonly type: string;
  /** Whether an honest answer can show a player up before someone in the role the dilemma names. */
  readonly compromising: boolean;
  readonly scale: string;
  /** Whether its options make a scale, which every player sees in their order instead of shuffled. */
  readonly fixedOrder: boolean;
}

/** One version of a dilemma: its number and a content that never changes. */
export class VersionVO {
  readonly number: number;
  readonly #text: TextVO;
  readonly #options: readonly { readonly id: IdVO; readonly text: TextVO }[];
  readonly #category: CategoryVO;
  readonly #tags: readonly TagVO[];
  readonly #minimumAge: MinimumAgeVO;
  readonly #type: DilemmaTypeVO;
  readonly #compromising: boolean;
  readonly #scale: ScaleVO;
  readonly #fixedOrder: boolean;

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
    this.#type = new DilemmaTypeVO(content.type);
    this.#compromising = content.compromising;
    this.#scale = new ScaleVO(content.scale);
    this.#fixedOrder = content.fixedOrder;

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

  get type(): DilemmaType {
    return this.#type.value;
  }

  get compromising(): boolean {
    return this.#compromising;
  }

  get scale(): Scale {
    return this.#scale.value;
  }

  get fixedOrder(): boolean {
    return this.#fixedOrder;
  }

  isSuitableForMinors(): boolean {
    return this.#minimumAge.isSuitableForMinors();
  }

  hasOption(optionId: string): boolean {
    return this.#options.some((option) => option.id.value === optionId);
  }

  /** The same content, whatever the number: nothing a player reads, the filter checks or a game is put together with has changed. */
  hasSameContentAs(other: VersionVO): boolean {
    return (
      this.category === other.category &&
      this.minimumAge === other.minimumAge &&
      this.type === other.type &&
      this.compromising === other.compromising &&
      this.scale === other.scale &&
      this.fixedOrder === other.fixedOrder &&
      sameItems(this.tags, other.tags) &&
      sameItems(
        this.options.map(({ id }) => id),
        other.options.map(({ id }) => id),
      ) &&
      this.#readsLike(other)
    );
  }

  /**
   * Whether it reads as the other version, so a translation of that one still translates it: the
   * same text and options, and the same tags or none at all.
   */
  hasTheWordingOf(other: VersionVO): boolean {
    return this.#readsLike(other) && (this.tags.length === 0 || sameItems(this.tags, other.tags));
  }

  #readsLike(other: VersionVO): boolean {
    return (
      this.text === other.text &&
      sameItems(
        this.options.map(({ text }) => text),
        other.options.map(({ text }) => text),
      )
    );
  }
}
