import type {
  DilemmaCatalog,
  DilemmaContent,
} from '../../application/ports/dilemma-catalog.port.ts';
import type { GameDilemma } from '../../domain/entities/game.ts';

/** How many contents an instance keeps; past that, the ones kept longest go first. */
const MAX_CONTENTS = 5000;

/**
 * Keeps in memory the content of each version played, in each language: a version never changes,
 * so it is read once per instance and not on every command. The current versions do change, and
 * are always asked for.
 */
export class CachedDilemmaCatalog implements DilemmaCatalog {
  readonly #catalog: DilemmaCatalog;
  readonly #contents = new Map<string, DilemmaContent>();

  constructor(catalog: DilemmaCatalog) {
    this.#catalog = catalog;
  }

  findOptionIds(dilemmaIds: readonly string[]): Promise<readonly GameDilemma[]> {
    return this.#catalog.findOptionIds(dilemmaIds);
  }

  async findContents(
    dilemmas: readonly { readonly dilemmaId: string; readonly version: number }[],
    language: string,
  ): Promise<readonly DilemmaContent[]> {
    const keyOf = ({ dilemmaId, version }: (typeof dilemmas)[number]) =>
      `${dilemmaId}@${version}:${language}`;
    const missing = dilemmas.filter((dilemma) => !this.#contents.has(keyOf(dilemma)));
    if (missing.length > 0) {
      const found = await this.#catalog.findContents(missing, language);
      missing.forEach((dilemma, index) => this.#keep(keyOf(dilemma), found[index]!));
    }
    return dilemmas.map((dilemma) => this.#contents.get(keyOf(dilemma))!);
  }

  #keep(key: string, content: DilemmaContent): void {
    this.#contents.set(key, content);
    if (this.#contents.size > MAX_CONTENTS) {
      this.#contents.delete(this.#contents.keys().next().value!);
    }
  }
}
