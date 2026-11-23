import type { Clock } from '../../domain/ports/clock.port.ts';
import type { PublishedVersions } from '../../domain/vos/legal-document.vo.ts';
import { type ConsentView, viewOf } from '../consent-view.ts';
import type { AcceptanceRepository } from '../ports/acceptance-repository.port.ts';
import type { DeletionLog } from '../ports/deletion-log.port.ts';
import type { GameData } from '../ports/game-data.port.ts';

/**
 * A player withdraws the game consent: they cannot create or join a room until
 * they give it again, and their game data still within their 24 hours are deleted at once, which
 * the deletion log keeps so that a restored backup does not bring them back.
 */
export class WithdrawGameConsentUseCase {
  readonly #acceptances: AcceptanceRepository;
  readonly #published: PublishedVersions;
  readonly #clock: Clock;
  readonly #gameData: GameData;
  readonly #deletionLog: DeletionLog;

  constructor(
    acceptances: AcceptanceRepository,
    published: PublishedVersions,
    clock: Clock,
    gameData: GameData,
    deletionLog: DeletionLog,
  ) {
    this.#acceptances = acceptances;
    this.#published = published;
    this.#clock = clock;
    this.#gameData = gameData;
    this.#deletionLog = deletionLog;
  }

  async execute(identity: string): Promise<ConsentView> {
    const acceptances = await this.#acceptances.findByIdentity(identity);
    // Nothing in force to withdraw, sent again or never given: no game data, nothing to log.
    if (acceptances.versionOf('game-consent') === undefined) {
      return viewOf(acceptances, this.#published);
    }
    acceptances.withdraw('game-consent', this.#clock.now());
    await this.#acceptances.save(acceptances);
    await this.#gameData.erase(identity);
    await this.#deletionLog.gameConsentWithdrawn(identity);
    return viewOf(acceptances, this.#published);
  }
}
