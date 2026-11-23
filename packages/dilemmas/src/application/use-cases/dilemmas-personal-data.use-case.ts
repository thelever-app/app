import type { WorldResultRepository } from '../ports/world-result-repository.port.ts';

/** What Dilemmas keeps of a player: the marks of the dilemmas they voted alone, never the option. */
export interface DilemmasData {
  readonly votedAlone: readonly { readonly dilemmaId: string; readonly version: number }[];
}

export interface ExportDilemmasData {
  execute(identity: string): Promise<DilemmasData | undefined>;
}

export class ExportDilemmasDataUseCase implements ExportDilemmasData {
  readonly #worldResults: WorldResultRepository;

  constructor(worldResults: WorldResultRepository) {
    this.#worldResults = worldResults;
  }

  async execute(identity: string): Promise<DilemmasData | undefined> {
    const votedAlone = await this.#worldResults.receiptsOf(identity);
    return votedAlone.length === 0 ? undefined : { votedAlone };
  }
}

/** Deleting the data of a player forgets which dilemmas they voted alone; the world result keeps the answers. */
export interface EraseDilemmasData {
  execute(identity: string): Promise<void>;
}

export class EraseDilemmasDataUseCase implements EraseDilemmasData {
  readonly #worldResults: WorldResultRepository;

  constructor(worldResults: WorldResultRepository) {
    this.#worldResults = worldResults;
  }

  async execute(identity: string): Promise<void> {
    await this.#worldResults.forgetReceiptsOf(identity);
  }
}
