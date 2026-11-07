import type {
  CatalogDilemma,
  DilemmaCatalog,
  DilemmaContent,
  DilemmaSearch,
} from '../../application/ports/dilemma-catalog.port.ts';
import type { GameDilemma } from '../../domain/entities/game.ts';

/** How many contents an instance keeps by default. */
const MAX_CONTENTS = 5000;

/**
 * Keeps in memory the content of each version played, in each language: a version never changes,
 * so it is read once per instance and not on every command. The current versions do change, and
 * are always asked for. Past its size, the content used longest ago goes first.
 */
export class CachedDilemmaCatalog implements DilemmaCatalog {
  readonly #catalog: DilemmaCatalog;
  readonly #contents = new Map<string, DilemmaContent>();
  readonly #maxContents: number;

  constructor(catalog: DilemmaCatalog, { maxContents = MAX_CONTENTS } = {}) {
    this.#catalog = catalog;
    this.#maxContents = maxContents;
  }

  findOptionIds(dilemmaIds: readonly string[]): Promise<readonly GameDilemma[]> {
    return this.#catalog.findOptionIds(dilemmaIds);
  }

  /** A search looks at the current versions, which change: it always asks the catalog. */
  search(criteria: DilemmaSearch): Promise<readonly CatalogDilemma[]> {
    return this.#catalog.search(criteria);
  }

  async findContents(
    dilemmas: readonly PlayedVersion[],
    language: string,
  ): Promise<readonly DilemmaContent[]> {
    const asked = dilemmas.map((dilemma) => ({ dilemma, key: keyOf(dilemma, language) }));
    // What it has is read, and marked as just used, before anything new can push it out.
    const contents = new Map<string, DilemmaContent>();
    for (const { key } of asked) {
      const kept = this.#use(key);
      if (kept) contents.set(key, kept);
    }
    const missing = asked.filter(({ key }) => !contents.has(key));
    if (missing.length > 0) {
      // The catalog answers in the order it is asked.
      const found = await this.#catalog.findContents(
        missing.map(({ dilemma }) => dilemma),
        language,
      );
      missing.forEach(({ key }, index) => {
        contents.set(key, found[index]!);
        this.#keep(key, found[index]!);
      });
    }
    return asked.map(({ key }) => contents.get(key)!);
  }

  /** The content kept under that key, moved to the end as the one used last. */
  #use(key: string): DilemmaContent | undefined {
    const content = this.#contents.get(key);
    if (!content) return undefined;
    this.#contents.delete(key);
    this.#contents.set(key, content);
    return content;
  }

  /** Keeps it, and lets go of the one used longest ago when there are too many. */
  #keep(key: string, content: DilemmaContent): void {
    this.#contents.set(key, content);
    if (this.#contents.size > this.#maxContents) {
      this.#contents.delete(this.#contents.keys().next().value!);
    }
  }
}

type PlayedVersion = { readonly dilemmaId: string; readonly version: number };

function keyOf({ dilemmaId, version }: PlayedVersion, language: string): string {
  return `${dilemmaId}@${version}:${language}`;
}
