import { DilemmaNotFoundError } from '../../application/errors/dilemma-not-found.error.ts';
import type {
  DilemmaCatalog,
  DilemmaContent,
} from '../../application/ports/dilemma-catalog.port.ts';
import type { GameDilemma } from '../../domain/entities/game.ts';

/** The only version of its dilemmas, which never change. */
const VERSION = 1;

/** A fixed set of dilemmas, at their first version and in a single language, for unit and acceptance tests. */
export class InMemoryDilemmaCatalog implements DilemmaCatalog {
  readonly #contents: ReadonlyMap<string, DilemmaContent>;

  constructor(contents: readonly DilemmaContent[]) {
    this.#contents = new Map(contents.map((content) => [content.dilemmaId, content]));
  }

  async findOptionIds(dilemmaIds: readonly string[]): Promise<readonly GameDilemma[]> {
    return dilemmaIds.map((dilemmaId) => ({
      dilemmaId,
      version: VERSION,
      optionIds: this.#contentOf(dilemmaId).options.map(({ optionId }) => optionId),
    }));
  }

  async findContents(
    dilemmas: readonly { readonly dilemmaId: string; readonly version: number }[],
  ): Promise<readonly DilemmaContent[]> {
    return dilemmas.map(({ dilemmaId, version }) => {
      if (version !== VERSION) throw new DilemmaNotFoundError(dilemmaId);
      return this.#contentOf(dilemmaId);
    });
  }

  #contentOf(dilemmaId: string): DilemmaContent {
    const content = this.#contents.get(dilemmaId);
    if (!content) throw new DilemmaNotFoundError(dilemmaId);
    return content;
  }
}
