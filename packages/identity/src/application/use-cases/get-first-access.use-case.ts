import type { Clock } from '../../domain/ports/clock.port.ts';
import { type FirstAccessView, viewOf } from '../first-access-view.ts';
import type { FirstAccessRepository } from '../ports/first-access-repository.port.ts';

/** Where the first access of an identity is now, without changing it; none if it never opened the app. */
export interface GetFirstAccess {
  execute(identity: string): Promise<FirstAccessView | undefined>;
}

export class GetFirstAccessUseCase implements GetFirstAccess {
  readonly #repository: FirstAccessRepository;
  readonly #clock: Clock;

  constructor(repository: FirstAccessRepository, clock: Clock) {
    this.#repository = repository;
    this.#clock = clock;
  }

  async execute(identity: string): Promise<FirstAccessView | undefined> {
    const firstAccess = await this.#repository.findByIdentity(identity);
    return firstAccess && viewOf(firstAccess, this.#clock.now());
  }
}
