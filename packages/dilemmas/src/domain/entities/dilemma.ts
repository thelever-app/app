import { ArgumentsDoNotMatchOptionsError } from '../errors/arguments-do-not-match-options.error.ts';
import { NotAnOriginalError } from '../errors/not-an-original.error.ts';
import { NotItsOriginalError } from '../errors/not-its-original.error.ts';
import { SameLanguageTranslationError } from '../errors/same-language-translation.error.ts';
import { TranslationOptionCountError } from '../errors/translation-option-count.error.ts';
import { UnknownOptionError } from '../errors/unknown-option.error.ts';
import type { IdGenerator } from '../ports/id-generator.port.ts';
import type { Category } from '../vos/category.vo.ts';
import type { DilemmaType } from '../vos/dilemma-type.vo.ts';
import type { Scale } from '../vos/scale.vo.ts';
import { type ArgumentsSnapshot, ArgumentsVO } from '../vos/arguments.vo.ts';
import { IdVO } from '../vos/id.vo.ts';
import { LanguageVO } from '../vos/language.vo.ts';
import type { MinimumAge } from '../vos/minimum-age.vo.ts';
import { TextVO } from '../vos/text.vo.ts';
import { VersionVO } from '../vos/version.vo.ts';

export interface OptionSnapshot {
  readonly id: string;
  readonly text: string;
}

/** Private: only for the rooms of its creator. Public: in the catalog, after the filter. */
export type Visibility = 'private' | 'public';

/** Of each version, apart from the visibility of the dilemma. */
export type DilemmaStatus =
  | 'in-review'
  | 'rejected'
  | 'approved'
  | 'in-exploration'
  | 'in-catalog'
  | 'out-of-exploration'
  | 'hidden-by-reports'
  | 'withdrawn';

/** Who wrote the dilemma; a player who deletes their data leaves their public dilemmas unlinked. */
export type Creator =
  | { readonly type: 'curation-team' }
  | { readonly type: 'player'; readonly identity: string }
  | { readonly type: 'unlinked-player' };

/** The version of an original that a version of a translation translates. */
export interface TranslationOf {
  readonly dilemmaId: string;
  readonly version: number;
}

/** Automatic: the translator made it and nobody corrected it. Reviewed: a person corrected it before publishing. */
export type Translation = 'automatic' | 'reviewed';

export interface VersionSnapshot {
  readonly number: number;
  readonly text: string;
  readonly options: readonly OptionSnapshot[];
  readonly category: Category;
  readonly tags: readonly string[];
  readonly minimumAge: MinimumAge;
  readonly type: DilemmaType;
  /** Whether an honest answer can show a player up before someone in the role the dilemma names. */
  readonly compromising: boolean;
  readonly scale: Scale;
  /** Whether every player sees its options in their order instead of shuffled. */
  readonly fixedOrder: boolean;
  readonly status: DilemmaStatus;
  /** Only in a translation. */
  readonly translationOf?: TranslationOf;
  /** Only in a translation. */
  readonly translation?: Translation;
  /** For the public web; adding or changing them makes no new version. */
  readonly arguments?: ArgumentsSnapshot;
}

export interface DilemmaSnapshot {
  readonly id: string;
  /** Random, and never changes: a link opens the dilemma with it without letting anyone guess others. */
  readonly publicId: string;
  /** The language the dilemma was written or translated in; each translation is a dilemma of its own. */
  readonly language: string;
  /** The short title the public web gives it; changing it makes no new version. */
  readonly name?: string;
  readonly creator: Creator;
  readonly visibility: Visibility;
  /** The current version; earlier ones never change and are read through the repository. */
  readonly version: VersionSnapshot;
}

/** What the translator gives for a version of an original: its content in another language, option by option. */
export interface TranslatedContent {
  readonly language: string;
  readonly name?: string;
  readonly text: string;
  /** In the order of the options of the original: option n translates option n. */
  readonly options: readonly string[];
  readonly tags: readonly string[];
}

/** How a version is classified, with its tags: a translation takes all of it from its original but the tags, which it translates. */
interface Classification {
  readonly category: string;
  readonly tags: readonly string[];
  readonly minimumAge: number;
  readonly type: string;
  readonly compromising: boolean;
  readonly scale: string;
  readonly fixedOrder: boolean;
}

/** Whatever its creator, a version in one of these is out of the reach of players. */
const UNREADABLE: readonly DilemmaStatus[] = [
  'in-review',
  'rejected',
  'hidden-by-reports',
  'withdrawn',
];

export class Dilemma {
  readonly #id: IdVO;
  readonly #publicId: IdVO;
  readonly #language: LanguageVO;
  #name: TextVO | undefined;
  readonly #creator: Creator;
  readonly #visibility: Visibility;
  #version: VersionVO;
  #status: DilemmaStatus;
  #translationOf: TranslationOf | undefined;
  #translation: Translation | undefined;
  #arguments: ArgumentsVO | undefined;

  private constructor(snapshot: DilemmaSnapshot) {
    this.#id = new IdVO(snapshot.id);
    this.#publicId = new IdVO(snapshot.publicId);
    this.#language = new LanguageVO(snapshot.language);
    this.#name = snapshot.name === undefined ? undefined : new TextVO(snapshot.name);
    this.#creator =
      snapshot.creator.type === 'player'
        ? { type: 'player', identity: new IdVO(snapshot.creator.identity).value }
        : snapshot.creator;
    this.#visibility = snapshot.visibility;
    this.#version = new VersionVO(snapshot.version.number, snapshot.version);
    this.#status = snapshot.version.status;
    this.#translationOf = snapshot.version.translationOf;
    this.#translation = snapshot.version.translation;
    this.#arguments =
      snapshot.version.arguments === undefined
        ? undefined
        : new ArgumentsVO(snapshot.version.arguments);
  }

  /** The curation team writes it: it is public and goes straight to the catalog. */
  static create(
    {
      text,
      language,
      name,
      options,
      ...classification
    }: {
      readonly text: string;
      readonly language: string;
      readonly name?: string;
      readonly options: readonly string[];
    } & Classification,
    idGenerator: IdGenerator,
  ): Dilemma {
    const id = idGenerator.generate();
    const version = new VersionVO(1, {
      text,
      options: options.map((option) => ({ id: idGenerator.generate(), text: option })),
      ...classification,
    });
    return new Dilemma({
      id,
      publicId: idGenerator.generate(),
      language,
      ...(name === undefined ? {} : { name }),
      creator: { type: 'curation-team' },
      visibility: 'public',
      version: { ...Dilemma.#snapshotOf(version), status: 'in-catalog' },
    });
  }

  /**
   * A dilemma of its own that translates the current version of an original, automatically:
   * with the classification, the creator and the visibility of the original, and its option n
   * translating option n of the original.
   */
  static translate(
    original: Dilemma,
    content: TranslatedContent,
    idGenerator: IdGenerator,
  ): Dilemma {
    if (original.translationOf) throw new NotAnOriginalError(original.id);
    if (content.language === original.language) {
      throw new SameLanguageTranslationError(content.language);
    }
    Dilemma.#checkOptionCount(original, content.options);

    const id = idGenerator.generate();
    const version = new VersionVO(1, {
      text: content.text,
      options: content.options.map((option) => ({ id: idGenerator.generate(), text: option })),
      ...original.#classification(),
      tags: content.tags,
    });
    return new Dilemma({
      id,
      publicId: idGenerator.generate(),
      language: content.language,
      ...(content.name === undefined ? {} : { name: content.name }),
      creator: original.creator,
      visibility: original.visibility,
      version: {
        ...Dilemma.#snapshotOf(version),
        status: Dilemma.#statusOfANewVersion(original.creator),
        translationOf: { dilemmaId: original.id, version: original.version },
        translation: 'automatic',
      },
    });
  }

  get id(): string {
    return this.#id.value;
  }

  get publicId(): string {
    return this.#publicId.value;
  }

  get language(): string {
    return this.#language.value;
  }

  get name(): string | undefined {
    return this.#name?.value;
  }

  /** Of the current version; none in an original. */
  get translationOf(): TranslationOf | undefined {
    return this.#translationOf;
  }

  /** Of the current version; none in an original. */
  get translation(): Translation | undefined {
    return this.#translation;
  }

  /** Of the current version, if it has any. */
  get arguments(): ArgumentsSnapshot | undefined {
    return this.#arguments?.toSnapshot();
  }

  get creator(): Creator {
    return this.#creator;
  }

  get visibility(): Visibility {
    return this.#visibility;
  }

  /** The number of the current version, from 1. */
  get version(): number {
    return this.#version.number;
  }

  get status(): DilemmaStatus {
    return this.#status;
  }

  get text(): string {
    return this.#version.text;
  }

  get options(): readonly OptionSnapshot[] {
    return this.#version.options;
  }

  get category(): Category {
    return this.#version.category;
  }

  get tags(): readonly string[] {
    return this.#version.tags;
  }

  get minimumAge(): MinimumAge {
    return this.#version.minimumAge;
  }

  get type(): DilemmaType {
    return this.#version.type;
  }

  /** Whether an honest answer can show a player up before someone in the role the dilemma names. */
  get compromising(): boolean {
    return this.#version.compromising;
  }

  get scale(): Scale {
    return this.#version.scale;
  }

  /** Whether every player sees its options in their order instead of shuffled. */
  get fixedOrder(): boolean {
    return this.#version.fixedOrder;
  }

  /** Whether a player under 18 may get the dilemma, at its current version. */
  isSuitableForMinors(): boolean {
    return this.#version.isSuitableForMinors();
  }

  /**
   * Changes the content with a new version; the earlier ones stay as they were, for the answers given to them.
   * An option with an id is one the dilemma keeps, perhaps with a new text; one without an id is new.
   * Nothing changes if the content is the same.
   */
  revise(
    {
      text,
      options,
      ...classification
    }: {
      readonly text: string;
      readonly options: readonly { readonly id?: string; readonly text: string }[];
    } & Classification,
    idGenerator: IdGenerator,
  ): void {
    const unknown = options.find(({ id }) => id !== undefined && !this.#version.hasOption(id));
    if (unknown?.id !== undefined) throw new UnknownOptionError(unknown.id);

    const next = new VersionVO(this.#version.number + 1, {
      text,
      options: options.map((option) => ({
        id: option.id ?? idGenerator.generate(),
        text: option.text,
      })),
      ...classification,
    });
    if (next.hasSameContentAs(this.#version)) return;

    this.#version = next;
    this.#status = Dilemma.#statusOfANewVersion(this.#creator);
    this.#arguments = undefined;
  }

  /**
   * Translates the new version of its original with a new version of its own: option n keeps the
   * id of option n, a new position gets a new id, and the classification follows the original.
   * Nothing changes if it already translates the current version of its original.
   */
  retranslate(
    original: Dilemma,
    content: Omit<TranslatedContent, 'language' | 'name'>,
    idGenerator: IdGenerator,
  ): void {
    if (this.#translationOf?.dilemmaId !== original.id) {
      throw new NotItsOriginalError(this.id, original.id);
    }
    if (this.#translationOf.version === original.version) return;
    Dilemma.#checkOptionCount(original, content.options);

    const current = this.#version.options;
    this.#version = new VersionVO(this.#version.number + 1, {
      text: content.text,
      options: content.options.map((text, index) => ({
        id: current[index]?.id ?? idGenerator.generate(),
        text,
      })),
      ...original.#classification(),
      tags: content.tags,
    });
    this.#followVersionOf(original);
    this.#arguments = undefined;
  }

  /**
   * Follows a new version of its original that reads as the one it translates (see
   * `hasTheWordingOf`) with a new version of its own: the same text, options and arguments, the
   * classification of the original, and no tags if the original has none. Nothing to translate.
   * Nothing changes if it already translates the current version of its original.
   */
  follow(original: Dilemma): void {
    if (this.#translationOf?.dilemmaId !== original.id) {
      throw new NotItsOriginalError(this.id, original.id);
    }
    if (this.#translationOf.version === original.version) return;
    Dilemma.#checkOptionCount(original, this.#version.options);

    this.#version = new VersionVO(this.#version.number + 1, {
      text: this.#version.text,
      options: this.#version.options,
      ...original.#classification(),
      tags: original.tags.length === 0 ? [] : this.#version.tags,
    });
    this.#followVersionOf(original);
  }

  /**
   * Whether its current version reads as that version of it: the same text and options, and the
   * same tags or none. A translation of that version then only has to follow it, not translate it.
   */
  hasTheWordingOf(other: Dilemma): boolean {
    return this.#version.hasTheWordingOf(other.#version);
  }

  /** Out of new games, at the version it has. */
  withdraw(): void {
    this.#status = 'withdrawn';
  }

  /**
   * A withdrawn dilemma back as a new version would leave it: in the catalog if the curation team
   * wrote it, in review if not. Nothing changes if it is not withdrawn.
   */
  reinstate(): void {
    if (this.#status === 'withdrawn') this.#status = Dilemma.#statusOfANewVersion(this.#creator);
  }

  /** Whether a player may read its current version: nothing keeps it in review or has taken it out. */
  canBeRead(): boolean {
    return !UNREADABLE.includes(this.#status);
  }

  /** A new name, without a new version. */
  rename(name: string): void {
    this.#name = new TextVO(name);
  }

  /** The current version without arguments, without a new version. */
  dropArguments(): void {
    this.#arguments = undefined;
  }

  /** The arguments of the current version, one for each of its options, without a new version. */
  argue(args: ArgumentsSnapshot): void {
    const vo = new ArgumentsVO(args);
    if (!vo.coversExactly(this.#version.options.map(({ id }) => id))) {
      throw new ArgumentsDoNotMatchOptionsError(this.id);
    }
    this.#arguments = vo;
  }

  toSnapshot(): DilemmaSnapshot {
    return {
      id: this.id,
      publicId: this.publicId,
      language: this.language,
      ...(this.name === undefined ? {} : { name: this.name }),
      creator: this.#creator,
      visibility: this.#visibility,
      version: {
        ...Dilemma.#snapshotOf(this.#version),
        status: this.#status,
        ...(this.#translationOf === undefined
          ? {}
          : { translationOf: this.#translationOf, translation: this.#translation! }),
        ...(this.#arguments === undefined ? {} : { arguments: this.#arguments.toSnapshot() }),
      },
    };
  }

  static restore(snapshot: DilemmaSnapshot): Dilemma {
    return new Dilemma(snapshot);
  }

  /** Only what the curation team writes skips the filter; anything else is reviewed. */
  static #statusOfANewVersion(creator: Creator): DilemmaStatus {
    return creator.type === 'curation-team' ? 'in-catalog' : 'in-review';
  }

  /** Its classification and its tags, for a translation to take the classification. */
  #classification(): Classification {
    return {
      category: this.category,
      tags: this.tags,
      minimumAge: this.minimumAge,
      type: this.type,
      compromising: this.compromising,
      scale: this.scale,
      fixedOrder: this.fixedOrder,
    };
  }

  /** A new version of a translation, of the current version of its original and automatic. */
  #followVersionOf(original: Dilemma): void {
    this.#status = Dilemma.#statusOfANewVersion(this.#creator);
    this.#translationOf = { dilemmaId: original.id, version: original.version };
    this.#translation = 'automatic';
  }

  static #checkOptionCount(original: Dilemma, options: readonly unknown[]): void {
    if (options.length !== original.options.length) {
      throw new TranslationOptionCountError(original.options.length, options.length);
    }
  }

  static #snapshotOf(version: VersionVO): Omit<VersionSnapshot, 'status'> {
    return {
      number: version.number,
      text: version.text,
      options: version.options,
      category: version.category,
      tags: version.tags,
      minimumAge: version.minimumAge,
      type: version.type,
      compromising: version.compromising,
      scale: version.scale,
      fixedOrder: version.fixedOrder,
    };
  }
}
