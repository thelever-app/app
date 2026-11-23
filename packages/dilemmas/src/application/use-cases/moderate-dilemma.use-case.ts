import { DilemmaNotFoundError } from '../errors/dilemma-not-found.error.ts';
import { familyOf } from '../catalog-number.ts';
import type { DilemmaRepository } from '../ports/dilemma-repository.port.ts';
import type { Dilemma } from '../../domain/entities/dilemma.ts';

/** What Moderation does to a dilemma: hide it while the team decides, restore it or withdraw it. */
export type ModerationAction = 'hide' | 'restore' | 'withdraw';

export interface ModerateDilemmaInput {
  readonly dilemmaId: string;
  readonly action: ModerationAction;
}

/** How another context moderates a dilemma of the catalog. */
export interface ModerateDilemma {
  execute(input: ModerateDilemmaInput): Promise<void>;
}

const ACTIONS: Readonly<Record<ModerationAction, (dilemma: Dilemma) => void>> = {
  hide: (dilemma) => dilemma.hideByReports(),
  restore: (dilemma) => dilemma.restoreAfterReports(),
  withdraw: (dilemma) => dilemma.withdrawByModeration(),
};

/**
 * Moderation hides, restores or withdraws a dilemma, and with a dilemma of the curated catalog,
 * the original and every translation of it: what makes one out of place makes all of them.
 */
export class ModerateDilemmaUseCase implements ModerateDilemma {
  readonly #dilemmaRepository: DilemmaRepository;
  readonly #languages: readonly string[];

  /** `languages`: every language a dilemma of the catalog is played in, as for loading it. */
  constructor(dilemmaRepository: DilemmaRepository, languages: readonly string[]) {
    this.#dilemmaRepository = dilemmaRepository;
    this.#languages = languages;
  }

  async execute({ dilemmaId, action }: ModerateDilemmaInput): Promise<void> {
    let found = false;
    for (const id of familyOf(dilemmaId, this.#languages)) {
      const dilemma = await this.#dilemmaRepository.findById(id);
      if (!dilemma) continue;
      found = true;
      ACTIONS[action](dilemma);
      await this.#dilemmaRepository.save(dilemma);
    }
    if (!found) throw new DilemmaNotFoundError(dilemmaId);
  }
}
