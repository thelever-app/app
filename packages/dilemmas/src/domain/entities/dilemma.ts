import { UnknownOptionError } from '../errors/unknown-option.error.ts';
import type { IdGenerator } from '../ports/id-generator.port.ts';
import type { Category } from '../vos/category.vo.ts';
import { IdVO } from '../vos/id.vo.ts';
import { LanguageVO } from '../vos/language.vo.ts';
import type { MinimumAge } from '../vos/minimum-age.vo.ts';
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

export interface VersionSnapshot {
  readonly number: number;
  readonly text: string;
  readonly options: readonly OptionSnapshot[];
  readonly category: Category;
  readonly tags: readonly string[];
  readonly minimumAge: MinimumAge;
  readonly status: DilemmaStatus;
}

export interface DilemmaSnapshot {
  readonly id: string;
  /** The language the dilemma was written in; each translation is a dilemma of its own. */
  readonly language: string;
  readonly creator: Creator;
  readonly visibility: Visibility;
  /** The current version; earlier ones never change and are read through the repository. */
  readonly version: VersionSnapshot;
}

/** What a player reads: the text and the options, in one language. */
export interface DilemmaContent {
  readonly text: string;
  readonly options: readonly OptionSnapshot[];
}

export class Dilemma {
  readonly #id: IdVO;
  readonly #language: LanguageVO;
  readonly #creator: Creator;
  readonly #visibility: Visibility;
  #version: VersionVO;
  #status: DilemmaStatus;

  private constructor(snapshot: DilemmaSnapshot) {
    this.#id = new IdVO(snapshot.id);
    this.#language = new LanguageVO(snapshot.language);
    this.#creator =
      snapshot.creator.type === 'player'
        ? { type: 'player', identity: new IdVO(snapshot.creator.identity).value }
        : snapshot.creator;
    this.#visibility = snapshot.visibility;
    this.#version = new VersionVO(snapshot.version.number, snapshot.version);
    this.#status = snapshot.version.status;
  }

  /** The curation team writes it: it is public and goes straight to the catalog. */
  static create(
    {
      text,
      language,
      options,
      category,
      tags,
      minimumAge,
    }: {
      readonly text: string;
      readonly language: string;
      readonly options: readonly string[];
      readonly category: string;
      readonly tags: readonly string[];
      readonly minimumAge: number;
    },
    idGenerator: IdGenerator,
  ): Dilemma {
    const id = idGenerator.generate();
    const version = new VersionVO(1, {
      text,
      options: options.map((option) => ({ id: idGenerator.generate(), text: option })),
      category,
      tags,
      minimumAge,
    });
    return new Dilemma({
      id,
      language,
      creator: { type: 'curation-team' },
      visibility: 'public',
      version: { ...Dilemma.#snapshotOf(version), status: 'in-catalog' },
    });
  }

  get id(): string {
    return this.#id.value;
  }

  get language(): string {
    return this.#language.value;
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
      category,
      tags,
      minimumAge,
    }: {
      readonly text: string;
      readonly options: readonly { readonly id?: string; readonly text: string }[];
      readonly category: string;
      readonly tags: readonly string[];
      readonly minimumAge: number;
    },
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
      category,
      tags,
      minimumAge,
    });
    if (next.hasSameContentAs(this.#version)) return;

    this.#version = next;
    // Only what the curation team writes skips the filter; anything else is reviewed again.
    this.#status = this.#creator.type === 'curation-team' ? 'in-catalog' : 'in-review';
  }

  /** The content in the language asked for, or in the original language while there is no translation. */
  contentIn(language: string): DilemmaContent {
    new LanguageVO(language);
    return { text: this.text, options: this.options };
  }

  toSnapshot(): DilemmaSnapshot {
    return {
      id: this.id,
      language: this.language,
      creator: this.#creator,
      visibility: this.#visibility,
      version: { ...Dilemma.#snapshotOf(this.#version), status: this.#status },
    };
  }

  static restore(snapshot: DilemmaSnapshot): Dilemma {
    return new Dilemma(snapshot);
  }

  static #snapshotOf(version: VersionVO): Omit<VersionSnapshot, 'status'> {
    return {
      number: version.number,
      text: version.text,
      options: version.options,
      category: version.category,
      tags: version.tags,
      minimumAge: version.minimumAge,
    };
  }
}
