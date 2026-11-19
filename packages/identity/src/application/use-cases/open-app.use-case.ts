import { FirstAccess } from '../../domain/entities/first-access.ts';
import type { Clock } from '../../domain/ports/clock.port.ts';
import { type FirstAccessView, viewOf } from '../first-access-view.ts';
import type { FirstAccessRepository } from '../ports/first-access-repository.port.ts';

export interface OpenAppInput {
  /** Who opens it, from their verified token. */
  readonly identity: string;
  /**
   * The country the address of the device is in, if known. The address itself never gets here:
   * only the region of this country is kept.
   */
  readonly country: string | undefined;
}

/**
 * Someone opens the app: the first time, their first access begins in the region of their
 * country; every time, it keeps when they opened it and whether they are in a blocked country. It
 * says where their first access is.
 */
export class OpenAppUseCase {
  readonly #repository: FirstAccessRepository;
  readonly #clock: Clock;

  constructor(repository: FirstAccessRepository, clock: Clock) {
    this.#repository = repository;
    this.#clock = clock;
  }

  async execute({ identity, country }: OpenAppInput): Promise<FirstAccessView> {
    const now = this.#clock.now();
    const found = await this.#repository.findByIdentity(identity);
    const firstAccess = found ?? FirstAccess.begin({ identity, country, now });
    if (found) found.open(now, country);
    await this.#repository.save(firstAccess);
    return viewOf(firstAccess, now);
  }
}
