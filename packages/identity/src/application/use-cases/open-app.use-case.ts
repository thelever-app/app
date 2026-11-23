import { FirstAccess } from '../../domain/entities/first-access.ts';
import type { Clock } from '../../domain/ports/clock.port.ts';
import type { Randomness } from '../../domain/ports/randomness.port.ts';
import { RequestCodeVO } from '../../domain/vos/request-code.vo.ts';
import { RequestCodeUnavailableError } from '../errors/request-code-unavailable.error.ts';
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

/** With 2^60 codes, ten taken in a row means something is wrong, not bad luck. */
const CODE_ATTEMPTS = 10;

/**
 * Someone opens the app: the first time, their first access begins in the region of their
 * country, with a code for requests by email that no other identity has; every time, it keeps when they opened it and whether they are in a blocked country. It
 * says where their first access is.
 */
export class OpenAppUseCase {
  readonly #repository: FirstAccessRepository;
  readonly #clock: Clock;
  readonly #randomness: Randomness;

  constructor(repository: FirstAccessRepository, clock: Clock, randomness: Randomness) {
    this.#repository = repository;
    this.#clock = clock;
    this.#randomness = randomness;
  }

  async execute({ identity, country }: OpenAppInput): Promise<FirstAccessView> {
    const now = this.#clock.now();
    const found = await this.#repository.findByIdentity(identity);
    const firstAccess =
      found ?? FirstAccess.begin({ identity, country, now, requestCode: await this.#freeCode() });
    if (found) found.open(now, country);
    await this.#repository.save(firstAccess);
    return viewOf(firstAccess, now);
  }

  async #freeCode(): Promise<RequestCodeVO> {
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
      const code = RequestCodeVO.generate(this.#randomness);
      if (!(await this.#repository.findByRequestCode(code.value))) return code;
    }
    throw new RequestCodeUnavailableError();
  }
}
