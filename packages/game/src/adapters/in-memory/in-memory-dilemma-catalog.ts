import { DilemmaNotFoundError } from '../../application/errors/dilemma-not-found.error.ts';
import type {
  DilemmaCatalog,
  DilemmaContent,
} from '../../application/ports/dilemma-catalog.port.ts';
import type { GameDilemma } from '../../domain/entities/game.ts';

/** A fixed set of dilemmas, in a single language, for unit and acceptance tests. */
export class InMemoryDilemmaCatalog implements DilemmaCatalog {
  readonly #contents: ReadonlyMap<string, DilemmaContent>;

  constructor(contents: readonly DilemmaContent[]) {
    this.#contents = new Map(contents.map((content) => [content.dilemmaId, content]));
  }

  async findOptionIds(dilemmaIds: readonly string[]): Promise<readonly GameDilemma[]> {
    return dilemmaIds.map((dilemmaId) => ({
      dilemmaId,
      optionIds: this.#contentOf(dilemmaId).options.map(({ optionId }) => optionId),
    }));
  }

  async findContents(dilemmaIds: readonly string[]): Promise<readonly DilemmaContent[]> {
    return dilemmaIds.map((dilemmaId) => this.#contentOf(dilemmaId));
  }

  #contentOf(dilemmaId: string): DilemmaContent {
    const content = this.#contents.get(dilemmaId);
    if (!content) throw new DilemmaNotFoundError(dilemmaId);
    return content;
  }
}
