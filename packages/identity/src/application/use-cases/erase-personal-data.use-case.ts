import type { Clock } from '../../domain/ports/clock.port.ts';
import type { DataDeletionRepository } from '../ports/data-deletion-repository.port.ts';
import type { GameDataOfIdentity, PersonalDataStore } from '../ports/personal-data-store.port.ts';

/**
 * The deletion job deletes what a deletion of the log asks for: every personal data store, or
 * only the game data when the game consent was withdrawn. It marks it erased only when they all
 * did it; if one fails, it stays pending and the next run does it again.
 */
export class ErasePersonalDataUseCase {
  readonly #deletions: DataDeletionRepository;
  readonly #stores: readonly PersonalDataStore[];
  readonly #gameData: GameDataOfIdentity;
  readonly #clock: Clock;

  constructor(
    deletions: DataDeletionRepository,
    stores: readonly PersonalDataStore[],
    gameData: GameDataOfIdentity,
    clock: Clock,
  ) {
    this.#deletions = deletions;
    this.#stores = stores;
    this.#gameData = gameData;
    this.#clock = clock;
  }

  async execute(deletionId: string): Promise<void> {
    const deletion = await this.#deletions.findById(deletionId);
    if (!deletion) throw new Error(`there is no deletion ${deletionId}`);
    if (deletion.reason === 'game-consent-withdrawn') {
      await this.#gameData.erase(deletion.identity);
    } else {
      for (const store of this.#stores) await store.erase(deletion.identity);
    }
    deletion.erased(this.#clock.now());
    await this.#deletions.save(deletion);
  }
}
